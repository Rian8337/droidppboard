import { FormEvent, useState } from "react";
import ManageGuard from "../../components/manage/ManageGuard";
import { useManageAction, useManageData } from "../../hooks/useManageData";
import {
    AdminKey,
    AdminVariant,
    CreatedKeyResponse,
    getManageErrorMessage,
    manageRequest,
} from "../../utils/manageApi";

export default function ManageKeys() {
    return (
        <ManageGuard title="Manage API Keys" adminOnly>
            <KeyManager />
        </ManageGuard>
    );
}

/**
 * Parses a rate limit input.
 *
 * @returns `null` for an empty input (unlimited), `undefined` if the input is invalid, or the limit.
 */
function parseRateLimit(value: string): number | null | undefined {
    const trimmed = value.trim();

    if (!trimmed) {
        return null;
    }

    return /^[1-9][0-9]{0,8}$/.test(trimmed) ? parseInt(trimmed) : undefined;
}

function KeyManager() {
    const {
        data,
        error: loadError,
        isLoading,
        reload,
    } = useManageData<AdminKey[]>("/keys");
    const variants = useManageData<AdminVariant[]>("/variants");
    const { run, error, isBusy } = useManageAction(reload);

    // The raw key lives only here, and is gone when it is dismissed or the page is left.
    const [created, setCreated] = useState<CreatedKeyResponse | null>(null);
    const [createError, setCreateError] = useState<string | undefined>();

    const variantNames = (variants.data ?? []).map((v) => v.name);

    return (
        <>
            {created ? (
                <RawKeyNotice
                    created={created}
                    onDismiss={() => setCreated(null)}
                />
            ) : null}

            <CreateKeyForm
                variantNames={variantNames}
                disabled={isBusy}
                error={createError}
                onCreate={async (input) => {
                    setCreateError(undefined);

                    const result = await manageRequest<CreatedKeyResponse>(
                        "POST",
                        "/keys",
                        input
                    );

                    if (result.ok && result.body) {
                        setCreated(result.body);
                        await reload();

                        return true;
                    }

                    setCreateError(getManageErrorMessage(result));

                    return false;
                }}
            />

            {loadError ? (
                <p className="manage-error">{loadError}</p>
            ) : isLoading || !data ? (
                <p className="manage-center">Loading...</p>
            ) : data.length === 0 ? (
                <p className="manage-center">There are no API keys.</p>
            ) : (
                data.map((key) => (
                    <KeyItem
                        key={key.name}
                        apiKey={key}
                        variantNames={variantNames}
                        isBusy={isBusy}
                        run={run}
                    />
                ))
            )}

            {error ? <p className="manage-error">{error}</p> : null}
        </>
    );
}

function RawKeyNotice(props: {
    created: CreatedKeyResponse;
    onDismiss: () => void;
}) {
    const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
        "idle"
    );

    async function copy() {
        try {
            await navigator.clipboard.writeText(props.created.rawKey);
            setCopyState("copied");
        } catch {
            setCopyState("failed");
        }
    }

    return (
        <section className="manage-section manage-notice" role="status">
            <h3>Key &quot;{props.created.key.name}&quot; created</h3>
            <p>
                Copy this key now. It can&apos;t be shown again once you dismiss
                this message or leave the page.
            </p>
            <div className="manage-inline-form">
                <input
                    className="manage-input"
                    type="text"
                    readOnly
                    value={props.created.rawKey}
                    onFocus={(e) => e.target.select()}
                    aria-label="Raw API key"
                />
                <button className="manage-button" type="button" onClick={copy}>
                    {copyState === "copied" ? "Copied" : "Copy"}
                </button>
                <button
                    className="manage-button"
                    type="button"
                    onClick={props.onDismiss}
                >
                    Dismiss
                </button>
            </div>
            {copyState === "failed" ? (
                <p className="manage-error">
                    Unable to copy. Select the key and copy it manually.
                </p>
            ) : null}
        </section>
    );
}

function CreateKeyForm(props: {
    variantNames: readonly string[];
    disabled: boolean;
    error?: string;
    onCreate(input: {
        name: string;
        rateLimitPerMinute: number | null;
        allVariants: boolean;
        canActForUsers: boolean;
        grants: string[];
    }): Promise<boolean>;
}) {
    const [name, setName] = useState("");
    const [limit, setLimit] = useState("");
    const [allVariants, setAllVariants] = useState(false);
    const [canActForUsers, setCanActForUsers] = useState(false);
    const [grants, setGrants] = useState<string[]>([]);
    const [isSubmitting, setSubmitting] = useState(false);

    const rateLimit = parseRateLimit(limit);
    const canSubmit =
        !props.disabled &&
        !isSubmitting &&
        !!name.trim() &&
        rateLimit !== undefined;

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canSubmit || rateLimit === undefined) {
            return;
        }

        setSubmitting(true);

        const ok = await props.onCreate({
            name: name.trim(),
            rateLimitPerMinute: rateLimit,
            allVariants,
            canActForUsers,
            grants: allVariants ? [] : grants,
        });

        if (ok) {
            setName("");
            setLimit("");
            setAllVariants(false);
            setCanActForUsers(false);
            setGrants([]);
        }

        setSubmitting(false);
    }

    return (
        <section className="manage-section">
            <h3>Create a key</h3>

            <form className="manage-form" onSubmit={submit}>
                <label>
                    Name
                    <input
                        className="manage-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </label>
                <label>
                    Requests per minute (empty for unlimited)
                    <input
                        className="manage-input"
                        type="text"
                        inputMode="numeric"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                    />
                </label>
                {rateLimit === undefined ? (
                    <span className="manage-counter-over">
                        Enter a positive whole number, or leave empty.
                    </span>
                ) : null}
                <label className="manage-check">
                    <input
                        type="checkbox"
                        checked={allVariants}
                        onChange={(e) => setAllVariants(e.target.checked)}
                    />
                    Can use every variant
                </label>
                <label className="manage-check">
                    <input
                        type="checkbox"
                        checked={canActForUsers}
                        onChange={(e) => setCanActForUsers(e.target.checked)}
                    />
                    Can act for users
                </label>

                {!allVariants && props.variantNames.length > 0 ? (
                    <fieldset className="manage-fieldset">
                        <legend>Variants</legend>
                        {props.variantNames.map((variant) => (
                            <label className="manage-check" key={variant}>
                                <input
                                    type="checkbox"
                                    checked={grants.includes(variant)}
                                    onChange={(e) =>
                                        setGrants(
                                            e.target.checked
                                                ? [...grants, variant]
                                                : grants.filter(
                                                      (g) => g !== variant
                                                  )
                                        )
                                    }
                                />
                                {variant}
                            </label>
                        ))}
                    </fieldset>
                ) : null}

                <button
                    className="manage-button"
                    type="submit"
                    disabled={!canSubmit}
                >
                    {isSubmitting ? "Creating..." : "Create"}
                </button>
            </form>

            {props.error ? <p className="manage-error">{props.error}</p> : null}
        </section>
    );
}

function KeyItem(props: {
    apiKey: AdminKey;
    variantNames: readonly string[];
    isBusy: boolean;
    run(write: () => ReturnType<typeof manageRequest>): Promise<boolean>;
}) {
    const { apiKey, run } = props;
    const path = `/keys/${encodeURIComponent(apiKey.name)}`;
    const isRevoked = apiKey.revokedAt !== null;

    const [limit, setLimit] = useState(
        apiKey.rateLimitPerMinute?.toString() ?? ""
    );
    const [grantToAdd, setGrantToAdd] = useState("");

    const rateLimit = parseRateLimit(limit);
    const grantable = props.variantNames.filter(
        (v) => !apiKey.grants.includes(v)
    );

    function revoke() {
        if (
            window.confirm(
                `Revoke the key "${apiKey.name}"? This cannot be undone.`
            )
        ) {
            run(() => manageRequest("POST", `${path}/revoke`));
        }
    }

    function setActForUsers(value: boolean) {
        if (
            !value &&
            !window.confirm(
                `Stop the key "${apiKey.name}" from acting for users?`
            )
        ) {
            return;
        }

        run(() => manageRequest("PATCH", path, { canActForUsers: value }));
    }

    return (
        <section className="manage-section">
            <h3>
                {apiKey.name}
                {isRevoked ? " (revoked)" : ""}
            </h3>

            <p>
                Created {new Date(apiKey.createdAt).toLocaleString()}
                {apiKey.revokedAt
                    ? `, revoked ${new Date(apiKey.revokedAt).toLocaleString()}`
                    : ""}
                . Limit:{" "}
                {apiKey.rateLimitPerMinute === null
                    ? "unlimited"
                    : `${apiKey.rateLimitPerMinute} per minute`}
                .
            </p>

            {isRevoked ? (
                <p>
                    Variants:{" "}
                    {apiKey.allVariants
                        ? "all"
                        : apiKey.grants.join(", ") || "none"}
                </p>
            ) : (
                <>
                    <form
                        className="manage-inline-form"
                        onSubmit={(e) => {
                            e.preventDefault();

                            if (rateLimit !== undefined) {
                                run(() =>
                                    manageRequest("PATCH", path, {
                                        rateLimitPerMinute: rateLimit,
                                    })
                                );
                            }
                        }}
                    >
                        <input
                            className="manage-input"
                            type="text"
                            inputMode="numeric"
                            placeholder="Unlimited"
                            aria-label="Requests per minute"
                            value={limit}
                            onChange={(e) => setLimit(e.target.value)}
                            disabled={props.isBusy}
                        />
                        <button
                            className="manage-button"
                            type="submit"
                            disabled={
                                props.isBusy ||
                                rateLimit === undefined ||
                                rateLimit === apiKey.rateLimitPerMinute
                            }
                        >
                            Update limit
                        </button>
                    </form>

                    <label className="manage-check">
                        <input
                            type="checkbox"
                            checked={apiKey.allVariants}
                            disabled={props.isBusy}
                            onChange={(e) =>
                                run(() =>
                                    manageRequest("PATCH", path, {
                                        allVariants: e.target.checked,
                                    })
                                )
                            }
                        />
                        Can use every variant
                    </label>
                    <label className="manage-check">
                        <input
                            type="checkbox"
                            checked={apiKey.canActForUsers}
                            disabled={props.isBusy}
                            onChange={(e) => setActForUsers(e.target.checked)}
                        />
                        Can act for users
                    </label>

                    <h4>Variants</h4>
                    {apiKey.grants.length === 0 ? (
                        <p>No variants are granted.</p>
                    ) : (
                        <ul className="manage-list">
                            {apiKey.grants.map((variant) => (
                                <li key={variant}>
                                    {variant}
                                    <button
                                        className="manage-button"
                                        type="button"
                                        disabled={props.isBusy}
                                        onClick={() =>
                                            run(() =>
                                                manageRequest(
                                                    "DELETE",
                                                    `${path}/grants/${encodeURIComponent(
                                                        variant
                                                    )}`
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

                    {grantable.length > 0 ? (
                        <form
                            className="manage-inline-form"
                            onSubmit={async (e) => {
                                e.preventDefault();

                                if (
                                    grantToAdd &&
                                    (await run(() =>
                                        manageRequest(
                                            "PUT",
                                            `${path}/grants/${encodeURIComponent(
                                                grantToAdd
                                            )}`
                                        )
                                    ))
                                ) {
                                    setGrantToAdd("");
                                }
                            }}
                        >
                            <select
                                className="manage-input"
                                aria-label="Variant to grant"
                                value={grantToAdd}
                                onChange={(e) => setGrantToAdd(e.target.value)}
                                disabled={props.isBusy}
                            >
                                <option value="">Select a variant</option>
                                {grantable.map((v) => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                            <button
                                className="manage-button"
                                type="submit"
                                disabled={props.isBusy || !grantToAdd}
                            >
                                Grant
                            </button>
                        </form>
                    ) : null}

                    <button
                        className="manage-button manage-danger"
                        type="button"
                        disabled={props.isBusy}
                        onClick={revoke}
                    >
                        Revoke
                    </button>
                </>
            )}
        </section>
    );
}
