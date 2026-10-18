import type { SerializedMod } from "@rian8337/osu-base";
import type { PPVariant } from "app-structures";
import { useState } from "react";
import { useTopPlays } from "../api/topPlays";
import { ErrorMessage } from "../components/ErrorMessage";
import { getSelectedAcronyms } from "../mods/droidMods";
import { ScoreTable } from "../scores/ScoreTable";
import styles from "./TopPlaysTab.module.css";
import { formatError } from "../api/http";

export interface TopPlaysTabProps {
    variant: PPVariant;
}

/** The best plays of every player in a variant, as a score table with a Player column. */
export function TopPlaysTab({ variant }: TopPlaysTabProps) {
    // A key per variant starts the table's search and sort over when the variant changes.
    return <TopPlays key={variant.name} variant={variant} />;
}

function TopPlays({ variant }: TopPlaysTabProps) {
    const [mods, setMods] = useState<readonly SerializedMod[]>([]);
    const {
        data: plays,
        error,
        isPending,
        isPlaceholderData,
        refetch,
    } = useTopPlays(variant.name, getSelectedAcronyms(mods));

    if (error && !plays) {
        return <ErrorMessage message={formatError(error)} onRetry={() => void refetch()} />;
    }

    if (isPending) {
        return <p className={styles.note}>Loading...</p>;
    }

    return (
        <ScoreTable
            scores={plays}
            showPlayer
            storageKey="top-plays-columns"
            mods={mods}
            onModsChange={setMods}
            isLoading={isPlaceholderData}
        />
    );
}
