import { useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { favoriteModsStorageKey, readFavoriteMods } from "./favoriteModsStorage";

export interface UseFavoriteModsResult {
    favorites: ReadonlySet<string>;
    toggleFavorite: (acronym: string) => void;
}

/** The favorite mod acronyms, remembered in this browser and shared by every mod picker. */
export function useFavoriteMods(): UseFavoriteModsResult {
    const [stored, setStored] = useLocalStorage<unknown>(favoriteModsStorageKey, []);
    const favorites = useMemo(() => new Set(readFavoriteMods(stored)), [stored]);

    function toggleFavorite(acronym: string) {
        const acronyms = readFavoriteMods(stored);

        setStored(
            favorites.has(acronym)
                ? acronyms.filter((entry) => entry !== acronym)
                : [...acronyms, acronym],
        );
    }

    return { favorites, toggleFavorite };
}
