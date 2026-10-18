/**
 * The subset of `Mod` fields the mod picker's search filters against. Kept as a narrow structural
 * type (rather than importing `Mod` from `osu-base`) so this stays a small, independently
 * testable pure function, mirroring `mappoolSearch.ts`'s `matchesMappoolSearch`.
 */
export interface SearchableMod {
    readonly acronym: string;
    readonly name: string;
}

/**
 * Whether `mod` matches the mod picker's search text - a case-insensitive substring check against
 * acronym and name alike, so typing "double" or "dt" both find Double Time. A blank/whitespace-only
 * query matches everything.
 */
export function matchesModSearch(mod: SearchableMod, query: string): boolean {
    const needle = query.trim().toLowerCase();

    if (!needle) {
        return true;
    }

    return mod.acronym.toLowerCase().includes(needle) || mod.name.toLowerCase().includes(needle);
}
