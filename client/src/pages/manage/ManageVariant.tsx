import { FormEvent, useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ManageGuard from "../../components/manage/ManageGuard";
import AuthContext from "../../hooks/AuthContext";
import {
    useManageAction,
    useManageData,
    useUsernames,
} from "../../hooks/useManageData";
import {
    AdminVariant,
    manageRequest,
    maxVariantDescriptionLength,
    maxVariantTitleLength,
} from "../../utils/manageApi";

export default function ManageVariant() {
    const { name } = useParams();

    return (
        <ManageGuard title={`Manage Variant: ${name ?? ""}`}>
            {name ? <VariantEditor name={name} /> : null}
        </ManageGuard>
    );
}

function VariantEditor(props: { name: string }) {
    const { user } = useContext(AuthContext);
    const { data, error, isLoading, reload } =
        useManageData<AdminVariant[]>("/variants");

    const variant = data?.find((v) => v.name === props.name);

    if (error) {
        return <p className="manage-error">{error}</p>;
    }

    if (isLoading || !data) {
        return <p className="manage-center">Loading...</p>;
    }

    if (!variant) {
        return (
            <p className="manage-center">
                This variant does not exist.{" "}
                <Link to="/manage">Back to variants</Link>
            </p>
        );
    }

    return (
        <>
            <p>
                <Link to="/manage">Back to variants</Link>
            </p>
            <DetailsSection
                variant={variant}
                isAdmin={user?.role === "admin"}
                reload={reload}
            />
            <AliasSection variant={variant} variants={data} reload={reload} />
            <GrantSection name={variant.name} />
        </>
    );
}

function DetailsSection(props: {
    variant: AdminVariant;
    isAdmin: boolean;
    reload: () => Promise<void>;
}) {
    const { variant } = props;
    const { run, error, isBusy } = useManageAction(props.reload);

    const [title, setTitle] = useState(variant.title ?? "");
    const [description, setDescription] = useState(variant.description ?? "");

    // Pick up the saved values after a reload.
    useEffect(() => {
        setTitle(variant.title ?? "");
        setDescription(variant.description ?? "");
    }, [variant.title, variant.description]);

    const isTitleTooLong = title.length > maxVariantTitleLength;
    const isDescriptionTooLong =
        description.length > maxVariantDescriptionLength;
    const isChanged =
        title !== (variant.title ?? "") ||
        description !== (variant.description ?? "");
    const canSave =
        isChanged && !isTitleTooLong && !isDescriptionTooLong && !isBusy;

    function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canSave) {
            return;
        }

        // Only what changed is sent, so that a stale form can't overwrite what someone else saved.
        const changes: { title?: string; description?: string } = {};

        if (title !== (variant.title ?? "")) {
            changes.title = title;
        }

        if (description !== (variant.description ?? "")) {
            changes.description = description;
        }

        if (Object.keys(changes).length === 0) {
            return;
        }

        run(() =>
            manageRequest(
                "PATCH",
                `/variants/${encodeURIComponent(variant.name)}`,
                changes
            )
        );
    }

    return (
        <section className="manage-section">
            <h3>Details</h3>

            <p>
                {variant.public ? "Public" : "Private"},{" "}
                {variant.available ? "available" : "unavailable"},{" "}
                {variant.instanceCount} instance
                {variant.instanceCount === 1 ? "" : "s"}
            </p>

            <form className="manage-form" onSubmit={save}>
                <label>
                    Title
                    <input
                        className="manage-input"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isBusy}
                    />
                </label>
                <span
                    className={
                        isTitleTooLong
                            ? "manage-counter-over"
                            : "manage-counter"
                    }
                >
                    {title.length} / {maxVariantTitleLength}
                </span>

                <label>
                    Description
                    <textarea
                        className="manage-input manage-textarea"
                        rows={8}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isBusy}
                    />
                </label>
                <span
                    className={
                        isDescriptionTooLong
                            ? "manage-counter-over"
                            : "manage-counter"
                    }
                >
                    {description.length} / {maxVariantDescriptionLength}
                </span>

                <button
                    className="manage-button"
                    type="submit"
                    disabled={!canSave}
                >
                    {isBusy ? "Saving..." : "Save"}
                </button>
            </form>

            <h4>Preview</h4>
            {/* Rendered as text only; the description is never interpreted as HTML. */}
            <p className="manage-preview">
                {description || "(no description)"}
            </p>

            {props.isAdmin ? (
                <label className="manage-check">
                    <input
                        type="checkbox"
                        checked={variant.public}
                        disabled={isBusy}
                        onChange={(e) =>
                            run(() =>
                                manageRequest(
                                    "PATCH",
                                    `/variants/${encodeURIComponent(
                                        variant.name
                                    )}`,
                                    { public: e.target.checked }
                                )
                            )
                        }
                    />
                    Public
                </label>
            ) : null}

            {error ? <p className="manage-error">{error}</p> : null}
        </section>
    );
}

function AliasSection(props: {
    variant: AdminVariant;
    variants: readonly AdminVariant[];
    reload: () => Promise<void>;
}) {
    const { run, error, isBusy } = useManageAction(props.reload);
    const [alias, setAlias] = useState("");

    async function add(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const name = alias.trim();

        if (!name) {
            return;
        }

        const owner = props.variants.find(
            (v) => v.name !== props.variant.name && v.aliases.includes(name)
        );

        if (
            owner &&
            !window.confirm(
                `Alias ${name} currently points to ${owner.name}. Repoint it to ${props.variant.name}?`
            )
        ) {
            return;
        }

        const ok = await run(() =>
            manageRequest("PUT", `/aliases/${encodeURIComponent(name)}`, {
                variant: props.variant.name,
            })
        );

        if (ok) {
            setAlias("");
        }
    }

    return (
        <section className="manage-section">
            <h3>Aliases</h3>

            {props.variant.aliases.length === 0 ? (
                <p>This variant has no aliases.</p>
            ) : (
                <ul className="manage-list">
                    {props.variant.aliases.map((a) => (
                        <li key={a}>
                            {a}
                            <button
                                className="manage-button"
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                    run(() =>
                                        manageRequest(
                                            "DELETE",
                                            `/aliases/${encodeURIComponent(a)}`
                                        )
                                    )
                                }
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <form className="manage-inline-form" onSubmit={add}>
                <input
                    className="manage-input"
                    type="text"
                    placeholder="New alias"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    disabled={isBusy}
                />
                <button
                    className="manage-button"
                    type="submit"
                    disabled={isBusy || !alias.trim()}
                >
                    Add
                </button>
            </form>

            {error ? <p className="manage-error">{error}</p> : null}
        </section>
    );
}

function GrantSection(props: { name: string }) {
    const path = `/variants/${encodeURIComponent(props.name)}/grants`;
    const {
        data,
        error: loadError,
        isLoading,
        reload,
    } = useManageData<number[]>(path);
    const { run, error, isBusy } = useManageAction(reload);
    const usernames = useUsernames(data ?? []);
    const [uid, setUid] = useState("");

    const parsedUid = /^[1-9][0-9]*$/.test(uid.trim()) ? parseInt(uid) : null;

    async function add(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (parsedUid === null) {
            return;
        }

        if (await run(() => manageRequest("PUT", `${path}/${parsedUid}`))) {
            setUid("");
        }
    }

    return (
        <section className="manage-section">
            <h3>Grants</h3>

            {loadError ? (
                <p className="manage-error">{loadError}</p>
            ) : isLoading || !data ? (
                <p>Loading...</p>
            ) : data.length === 0 ? (
                <p>Nobody has been granted this variant.</p>
            ) : (
                <ul className="manage-list">
                    {data.map((granted) => (
                        <li key={granted}>
                            {usernames.get(granted) ?? "Unknown user"} (
                            {granted})
                            <button
                                className="manage-button"
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                    run(() =>
                                        manageRequest(
                                            "DELETE",
                                            `${path}/${granted}`
                                        )
                                    )
                                }
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <form className="manage-inline-form" onSubmit={add}>
                <input
                    className="manage-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="User ID"
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    disabled={isBusy}
                />
                <button
                    className="manage-button"
                    type="submit"
                    disabled={isBusy || parsedUid === null}
                >
                    Grant
                </button>
            </form>

            {error ? <p className="manage-error">{error}</p> : null}
        </section>
    );
}
