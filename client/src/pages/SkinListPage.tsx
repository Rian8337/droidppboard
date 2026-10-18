import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IPlayerSkin } from "app-structures";
import { Link } from "react-router";
import { skinPageSize, useSkins } from "../api/skins";
import { formatError } from "../api/http";
import { DataTable, type Column } from "../components/DataTable";
import { ErrorMessage } from "../components/ErrorMessage";
import { Paging } from "../components/Paging";
import { TextField } from "../components/TextField";
import { useSearchState } from "../hooks/useSearchState";
import pageStyles from "./Page.module.css";
import styles from "./SkinListPage.module.css";

interface SkinRow {
    readonly number: number;
    readonly skin: IPlayerSkin;
}

const columns: Column<SkinRow>[] = [
    { id: "number", header: "No.", render: ({ number }) => number },
    {
        id: "name",
        header: "Name",
        render: ({ skin }) => (
            <Link
                className={pageStyles.link}
                to={`/skin/${encodeURIComponent(skin.discordid)}/${encodeURIComponent(skin.name)}`}
            >
                {skin.name}
            </Link>
        ),
    },
    {
        id: "description",
        header: "Description",
        render: ({ skin }) => (
            <span className={styles.description}>{skin.description || "No description"}</span>
        ),
    },
];

/** Skins people shared through the Discord bot, searchable by name. */
export function SkinListPage() {
    const { input, setInput, search, page, setPage } = useSearchState();
    const { data: skins, error, isPending, refetch } = useSkins(page, search);

    function renderBody() {
        if (error && !skins) {
            return <ErrorMessage message={formatError(error)} onRetry={() => void refetch()} />;
        }

        if (isPending) {
            return <p className={pageStyles.note}>Loading...</p>;
        }

        const rows = skins.map<SkinRow>((skin, index) => ({
            number: (page - 1) * skinPageSize + index + 1,
            skin,
        }));

        return (
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={({ skin }) => `${skin.discordid}:${skin.name}`}
                emptyText="No skins found."
            />
        );
    }

    return (
        <div className={pageStyles.page}>
            <h2 className={pageStyles.title}>Player skins</h2>
            <div className={pageStyles.prose}>
                <p>
                    This page is out of scope of this website. However, it was made so that the skin
                    command in{" "}
                    <a href="https://github.com/Rian8337/Alice" target="_blank" rel="noreferrer">
                        Alice
                    </a>{" "}
                    has a more meaningful feature and as a response to the{" "}
                    <a href="https://tsukushi.site" target="_blank" rel="noreferrer">
                        old skin site
                    </a>{" "}
                    dying.
                </p>
                <p>Click or tap a skin&apos;s name to visit its preview page.</p>
            </div>
            <div className={pageStyles.toolbar}>
                <TextField
                    type="search"
                    className={pageStyles.search}
                    aria-label="Search skins"
                    placeholder="Search skins"
                    icon={<FontAwesomeIcon icon={faMagnifyingGlass} />}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                />
            </div>
            {renderBody()}
            <Paging page={page} onPageChange={setPage} hasNext={skins?.length === skinPageSize} />
        </div>
    );
}
