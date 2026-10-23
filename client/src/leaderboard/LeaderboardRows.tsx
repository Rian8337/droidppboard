import type { PPVariant } from "app-structures";
import { Link } from "react-router";
import { CountryFlag } from "../components/CountryFlag";
import { getProfilePath } from "../routing/paths";
import { formatPp } from "../utils/formatPp";
import { getDifference, variantWithoutMaster } from "./difference";
import { DifferenceText } from "./DifferenceText";
import { isOutdated } from "./isOutdated";
import type { LeaderboardEntry } from "./LeaderboardEntry";
import styles from "./LeaderboardRows.module.css";
import { OutdatedPill } from "./OutdatedPill";

export interface LeaderboardRowsProps {
    variant: PPVariant;
    entries: LeaderboardEntry[];
}

/**
 * The leaderboard for a phone: one stacked row per player, linking to their profile. A phone row has no
 * column headers, so the totals beneath local pp are labelled, in the same order as the desktop table.
 */
export function LeaderboardRows({ variant, entries }: LeaderboardRowsProps) {
    return (
        <ol className={styles.rows}>
            {entries.map(({ rank, player }) => {
                const masterPPTotal =
                    variant.name === variantWithoutMaster ? undefined : player.masterPPTotal;

                return (
                    <li key={player.uid}>
                        <Link to={getProfilePath(variant.name, player.uid)} className={styles.row}>
                            <span className={styles.rank}>{rank}</span>
                            <span className={styles.player}>
                                <CountryFlag code={player.country} />
                                {player.username}
                                {isOutdated(player, variant) && <OutdatedPill />}
                            </span>
                            <span className={styles.local}>{formatPp(player.localPPTotal)}</span>
                            <span className={styles.beneath}>
                                <span>
                                    <span className={styles.label}>live</span>{" "}
                                    {formatPp(player.livePPTotal)}
                                </span>
                                {masterPPTotal !== undefined && (
                                    <span>
                                        <span className={styles.label}>master</span>{" "}
                                        {formatPp(masterPPTotal)}
                                    </span>
                                )}
                                <DifferenceText difference={getDifference(player)} />
                            </span>
                        </Link>
                    </li>
                );
            })}
        </ol>
    );
}
