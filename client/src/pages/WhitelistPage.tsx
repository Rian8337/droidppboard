import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IMapWhitelist } from "app-structures";
import { useState } from "react";
import { ApiError, formatApiError } from "../api/http";
import { useWhitelist, whitelistPageSize } from "../api/whitelist";
import { DataTable, type Column, type SortState } from "../components/DataTable";
import { ErrorMessage } from "../components/ErrorMessage";
import { Paging } from "../components/Paging";
import { TextField } from "../components/TextField";
import { useSearchState } from "../hooks/useSearchState";
import { WhitelistFilterHelp } from "../whitelist/WhitelistFilterHelp";
import pageStyles from "./Page.module.css";

/** The column id of each sortable column, as the server's `sort=` option names it. */
const sortOptions: Readonly<Record<string, string>> = {
    name: "mapname",
    cs: "cs",
    ar: "ar",
    od: "od",
    hp: "hp",
    sr: "sr",
    bpm: "bpm",
};

/**
 * The query the server reads: the search words, and the sort of the clicked header (a leading "-"
 * is descending). A header's sort replaces a `sort=` the person typed.
 */
function buildQuery(search: string, sort: SortState | undefined): string {
    if (!sort) {
        return search;
    }

    const words = search.replace(/(^|\s)sort=\S*/gi, " ").trim();
    const sortWord = `sort=${sort.direction === "descending" ? "-" : ""}${sortOptions[sort.columnId]}`;

    return words === "" ? sortWord : `${words} ${sortWord}`;
}

const columns: Column<IMapWhitelist>[] = [
    {
        id: "name",
        header: "Beatmap",
        isSortable: true,
        render: ({ mapid, mapname }) => (
            <a
                className={pageStyles.link}
                href={`https://osu.ppy.sh/b/${mapid}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                {mapname}
            </a>
        ),
    },
    ...(["cs", "ar", "od", "hp", "sr", "bpm"] as const).map<Column<IMapWhitelist>>((stat) => ({
        id: stat,
        header: stat.toUpperCase(),
        isSortable: true,
        align: "right",
        render: ({ diffstat }) => String(diffstat[stat]),
    })),
];

/** The beatmaps that were whitelisted before osu!droid 1.8, searched and sorted on the server. */
export function WhitelistPage() {
    const { input, setInput, search, page, setPage } = useSearchState();
    const [sort, setSort] = useState<SortState | undefined>();
    const {
        data: beatmaps,
        error,
        isPending,
        refetch,
    } = useWhitelist(page, buildQuery(search, sort));

    function renderBody() {
        if (error && !beatmaps) {
            return (
                <ErrorMessage
                    message={error instanceof ApiError ? formatApiError(error) : error.message}
                    onRetry={() => void refetch()}
                />
            );
        }

        if (isPending) {
            return <p className={pageStyles.note}>Loading...</p>;
        }

        return (
            <DataTable
                columns={columns}
                rows={beatmaps}
                rowKey={({ mapid }) => String(mapid)}
                sort={sort}
                onSortChange={(next) => {
                    setSort(next);
                    setPage(1);
                }}
                emptyText="No beatmaps found."
            />
        );
    }

    return (
        <div className={pageStyles.page}>
            <h2 className={pageStyles.title}>Whitelisted beatmaps</h2>
            <div className={pageStyles.prose}>
                <p>
                    The whitelist system is an artifact of the osu!droid PP Project before osu!droid
                    version 1.8.
                </p>
                <p>
                    Historically, all whitelisted beatmaps were able to give pp. Treat this as the
                    system&apos;s own &quot;approved beatmaps&quot; list back then.
                </p>
                <p>Click or tap a beatmap&apos;s name to visit its osu! page.</p>
            </div>
            <div className={pageStyles.toolbar}>
                <TextField
                    type="search"
                    className={pageStyles.search}
                    aria-label="Search beatmaps"
                    placeholder="Search or filter beatmaps"
                    icon={<FontAwesomeIcon icon={faMagnifyingGlass} />}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                />
            </div>
            <WhitelistFilterHelp />
            {renderBody()}
            <Paging
                page={page}
                onPageChange={setPage}
                hasNext={beatmaps?.length === whitelistPageSize}
            />
        </div>
    );
}
