import { faMagnifyingGlass, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { useAdminKeys, useAdminVariants, type AdminKey, type CreatedKey } from "../api/manage";
import { Button } from "../components/Button";
import { DataTable, type Column } from "../components/DataTable";
import { ErrorMessage } from "../components/ErrorMessage";
import { Paging } from "../components/Paging";
import { Pill } from "../components/Pill";
import { TextField } from "../components/TextField";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { CreatedKeyDialog } from "./CreatedKeyDialog";
import { KeyEditor, type KeyVariantList } from "./KeyEditor";
import styles from "./KeysPage.module.css";
import { formatError } from "../api/http";

/** How many keys a page of the list holds. */
export const keysPerPage = 25;

/** What the editor shows: nothing, the form that creates a key, or an existing key (by name). */
type Selection = { kind: "none" } | { kind: "new" } | { kind: "key"; name: string };

function formatScope(key: AdminKey): string {
    if (key.allVariants) {
        return "All variants";
    }

    return `${key.grants.length} ${key.grants.length === 1 ? "variant" : "variants"}`;
}

const columns: Column<AdminKey>[] = [
    { id: "name", header: "Name", render: (key) => key.name },
    {
        id: "limit",
        header: "Rate limit",
        render: (key) =>
            key.rateLimitPerMinute === null ? "Unlimited" : `${key.rateLimitPerMinute} per minute`,
    },
    { id: "scope", header: "Scope", render: formatScope },
    { id: "acts", header: "Acts for users", render: (key) => (key.canActForUsers ? "Yes" : "No") },
    { id: "created", header: "Created", render: (key) => key.createdAt.slice(0, 10) },
    {
        id: "status",
        header: "Status",
        render: (key) =>
            key.revokedAt === null ? (
                <Pill tone="success">Active</Pill>
            ) : (
                <Pill tone="failure">Revoked</Pill>
            ),
    },
];

/**
 * The API keys: a compact list, and the editor of the selected key beside it on a desktop or instead of it on a
 * smaller screen. A key's raw value is shown once after it is created.
 */
export function KeysPage() {
    const keys = useAdminKeys({ isEnabled: true });
    const variants = useAdminVariants();
    const isDesktop = useBreakpoint() === "desktop";
    const [selection, setSelection] = useState<Selection>({ kind: "none" });
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [created, setCreated] = useState<CreatedKey | null>(null);

    if (keys.error) {
        return (
            <ErrorMessage message={formatError(keys.error)} onRetry={() => void keys.refetch()} />
        );
    }

    if (!keys.data) {
        return <p className={styles.note}>Loading...</p>;
    }

    const needle = search.trim().toLowerCase();
    const matching = keys.data.filter((key) => key.name.toLowerCase().includes(needle));
    const visible = matching.slice((page - 1) * keysPerPage, page * keysPerPage);
    const selectedKey =
        selection.kind === "key"
            ? (keys.data.find((key) => key.name === selection.name) ?? null)
            : null;
    const isEditorOpen = selection.kind === "new" || selectedKey !== null;
    const variantList: KeyVariantList = {
        names: variants.data?.map((variant) => variant.name),
        error: variants.error,
        onRetry: () => void variants.refetch(),
    };

    function closeEditor() {
        setSelection({ kind: "none" });
    }

    function showCreated(result: CreatedKey) {
        setCreated(result);
        setSelection({ kind: "key", name: result.key.name });
    }

    const list = (
        <div className={styles.list}>
            <div className={styles.toolbar}>
                <TextField
                    type="search"
                    aria-label="Search keys"
                    placeholder="Search keys"
                    autoComplete="off"
                    icon={<FontAwesomeIcon icon={faMagnifyingGlass} />}
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                />
                <Button onClick={() => setSelection({ kind: "new" })}>
                    <FontAwesomeIcon icon={faPlus} />
                    Create key
                </Button>
            </div>
            <DataTable
                columns={columns}
                rows={visible}
                rowKey={(key) => key.name}
                onRowClick={(key) => setSelection({ kind: "key", name: key.name })}
                emptyText={needle === "" ? "There are no API keys." : "No key matches the search."}
            />
            {matching.length > keysPerPage && (
                <Paging
                    page={page}
                    onPageChange={setPage}
                    hasNext={page * keysPerPage < matching.length}
                />
            )}
        </div>
    );

    const editor = isEditorOpen && (
        <aside className={styles.editor} aria-label="Key editor">
            <KeyEditor
                key={selection.kind === "key" ? selection.name : "new"}
                apiKey={selectedKey}
                variantList={variantList}
                onClose={closeEditor}
                onCreated={showCreated}
            />
        </aside>
    );

    return (
        <>
            {isDesktop ? (
                <div className={isEditorOpen ? styles.split : undefined}>
                    {list}
                    {editor}
                </div>
            ) : (
                // Below a desktop the editor takes the page, and closing it returns to the list.
                editor || list
            )}
            <CreatedKeyDialog created={created} onClose={() => setCreated(null)} />
        </>
    );
}
