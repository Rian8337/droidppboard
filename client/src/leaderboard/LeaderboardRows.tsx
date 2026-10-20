import type { PPVariant } from "app-structures";
import { Link } from "react-router";
import { CountryFlag } from "../components/CountryFlag";
import { getProfilePath } from "../routing/paths";
import { formatPp } from "../utils/formatPp";
import { getDifference } from "./difference";
import { DifferenceText } from "./DifferenceText";
import { isOutdated } from "./isOutdated";
import type { LeaderboardEntry } from "./LeaderboardEntry";
import styles from "./LeaderboardRows.module.css";
import { OutdatedPill } from "./OutdatedPill";

export interface LeaderboardRowsProps {
    variant: PPVariant;
    entries: LeaderboardEntry[];
}

/** The leaderboard for a phone: one stacked row per player, linking to their profile. */
export function LeaderboardRows({ variant, entries }: LeaderboardRowsProps) {
    return (
        <ol className={styles.rows}>
            {entries.map(({ rank, player }) => (
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
                            <span className={styles.live}>{formatPp(player.livePPTotal)}</span>
                            <DifferenceText difference={getDifference(player)} />
                        </span>
                    </Link>
                </li>
            ))}
        </ol>
    );
}
