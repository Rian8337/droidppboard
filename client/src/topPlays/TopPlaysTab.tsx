import type { PPVariant } from "app-structures";
import { useTopPlays } from "../api/topPlays";
import { ErrorMessage } from "../components/ErrorMessage";
import { ScoreTable } from "../scores/ScoreTable";
import styles from "./TopPlaysTab.module.css";

export interface TopPlaysTabProps {
    variant: PPVariant;
}

/** The mod filter has no picker yet, so every play shows. */
const noModAcronyms: string[] = [];

/** The best plays of every player in a variant, as a score table with a Player column. */
export function TopPlaysTab({ variant }: TopPlaysTabProps) {
    // A key per variant starts the table's search and sort over when the variant changes.
    return <TopPlays key={variant.name} variant={variant} />;
}

function TopPlays({ variant }: TopPlaysTabProps) {
    const { data: plays, error, isPending, refetch } = useTopPlays(variant.name, noModAcronyms);

    if (error && !plays) {
        return <ErrorMessage message={error.message} onRetry={() => void refetch()} />;
    }

    if (isPending) {
        return <p className={styles.note}>Loading...</p>;
    }

    return <ScoreTable scores={plays} showPlayer storageKey="top-plays-columns" />;
}
