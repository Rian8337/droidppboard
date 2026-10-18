/** Where the favorite mod acronyms are kept in this browser. */
export const favoriteModsStorageKey = "favorite-mods";

/** Reads the stored favorites, ignoring anything that is not a list of text. */
export function readFavoriteMods(stored: unknown): string[] {
    return Array.isArray(stored) && stored.every((entry) => typeof entry === "string")
        ? stored
        : [];
}
