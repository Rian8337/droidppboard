import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { PPVariant } from "app-structures";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { leaderboardPageSize, useLeaderboard } from "../api/leaderboard";
import { useMe } from "../api/auth";
import { Button } from "../components/Button";
import { DataTable, type Column } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage";
import { Paging } from "../components/Paging";
import { TextField } from "../components/TextField";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { getProfilePath } from "../routing/paths";
import { formatPp } from "../utils/formatPp";
import { getDifference, variantWithoutMaster } from "./difference";
import { DifferenceText } from "./DifferenceText";
import type { LeaderboardEntry } from "./LeaderboardEntry";
import { LeaderboardRows } from "./LeaderboardRows";
import styles from "./LeaderboardTab.module.css";
import { formatError } from "../api/http";

/** How long typing must pause before the search is sent. */
const searchDelayMs = 300;

export interface LeaderboardTabProps {
    variant: PPVariant;
}

/** A variant's players ranked by local pp, searchable and paged on the server. */
export function LeaderboardTab({ variant }: LeaderboardTabProps) {
    // A key per variant starts the search and page over when the variant changes.
    return <Leaderboard key={variant.name} variant={variant} />;
}

function Leaderboard({ variant }: LeaderboardTabProps) {
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const { data: players, error, isPending, refetch } = useLeaderboard(variant.name, page, search);
    const { data: me = null } = useMe();
    const breakpoint = useBreakpoint();
    const navigate = useNavigate();

    useEffect(() => {
        const timeout = setTimeout(() => {
            const trimmed = searchInput.trim();

            // Only a different search starts over; the first run on mount must keep the page.
            if (trimmed !== search) {
                setSearch(trimmed);
                setPage(1);
            }
        }, searchDelayMs);

        return () => clearTimeout(timeout);
    }, [searchInput, search]);

    const entries: LeaderboardEntry[] = (players ?? []).map((player, index) => ({
        rank: (page - 1) * leaderboardPageSize + index + 1,
        player,
    }));
    const hasMaster =
        variant.name !== variantWithoutMaster &&
        entries.some(({ player }) => player.masterPPTotal !== undefined);

    const columns: Column<LeaderboardEntry>[] = [
        { id: "rank", header: "Rank", render: ({ rank }) => rank },
        { id: "player", header: "Player", render: ({ player }) => player.username },
        {
            id: "live",
            header: "Live pp",
            align: "right",
            render: (e) => formatPp(e.player.livePPTotal),
        },
        ...(hasMaster
            ? [
                  {
                      id: "master",
                      header: "Master pp",
                      align: "right" as const,
                      render: ({ player }: LeaderboardEntry) =>
                          player.masterPPTotal === undefined ? "-" : formatPp(player.masterPPTotal),
                  },
              ]
            : []),
        {
            id: "local",
            header: "Local pp",
            align: "right",
            render: ({ player }) => <b>{formatPp(player.localPPTotal)}</b>,
        },
        {
            id: "difference",
            header: "Difference",
            align: "right",
            render: ({ player }) => <DifferenceText difference={getDifference(player)} />,
        },
    ];

    function renderBody() {
        if (error && !players) {
            return <ErrorMessage message={formatError(error)} onRetry={() => void refetch()} />;
        }

        if (isPending) {
            return <p className={styles.note}>Loading...</p>;
        }

        if (breakpoint === "phone") {
            return entries.length === 0 ? (
                <EmptyState message="No players found." />
            ) : (
                <LeaderboardRows variant={variant.name} entries={entries} />
            );
        }

        return (
            <DataTable
                columns={columns}
                rows={entries}
                rowKey={({ player }) => String(player.uid)}
                onRowClick={({ player }) => void navigate(getProfilePath(variant.name, player.uid))}
                emptyText="No players found."
            />
        );
    }

    return (
        <div>
            <div className={styles.toolbar}>
                <TextField
                    type="search"
                    className={styles.search}
                    aria-label="Search player"
                    placeholder="Search player"
                    icon={<FontAwesomeIcon icon={faMagnifyingGlass} />}
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                />
                {me && (
                    <Button
                        variant="secondary"
                        onClick={() => void navigate(getProfilePath(variant.name, me.uid))}
                    >
                        Open my profile
                    </Button>
                )}
            </div>
            {renderBody()}
            <Paging
                page={page}
                onPageChange={setPage}
                hasNext={entries.length === leaderboardPageSize}
            />
        </div>
    );
}
