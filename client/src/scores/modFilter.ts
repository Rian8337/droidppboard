import type { ScoreRow } from "./rankChanges";

export interface ScoreFilter {
    /** Text the map title must contain, ignoring case. */
    search: string;

    /** Acronyms of mods a score must all have. Mod settings, such as a Custom Speed rate, are ignored. */
    modAcronyms: readonly string[];
}

/** Keeps the scores whose map title contains the search and that have every selected mod. */
export function filterScores(rows: ScoreRow[], { search, modAcronyms }: ScoreFilter): ScoreRow[] {
    const searchText = search.trim().toLowerCase();

    return rows.filter((row) => {
        if (!row.title.toLowerCase().includes(searchText)) {
            return false;
        }

        return modAcronyms.every((acronym) => row.mods.some((mod) => mod.acronym === acronym));
    });
}
