import { act, renderHook } from "@testing-library/react";
import { favoriteModsStorageKey } from "../../src/mods/favoriteModsStorage";
import { useFavoriteMods } from "../../src/mods/useFavoriteMods";

function readStoredFavorites(): unknown {
    return JSON.parse(localStorage.getItem(favoriteModsStorageKey) ?? "null");
}

describe("useFavoriteMods", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("starts empty when nothing is stored", () => {
        const { result } = renderHook(() => useFavoriteMods());

        expect(result.current.favorites.size).toBe(0);
    });

    it("loads stored favorites on mount", () => {
        localStorage.setItem(favoriteModsStorageKey, JSON.stringify(["DT", "HD"]));

        const { result } = renderHook(() => useFavoriteMods());

        expect(result.current.favorites.has("DT")).toBe(true);
        expect(result.current.favorites.has("HD")).toBe(true);
    });

    it("starts empty when the stored value is not a list of acronyms", () => {
        localStorage.setItem(favoriteModsStorageKey, JSON.stringify(["DT", 5]));

        const { result } = renderHook(() => useFavoriteMods());

        expect(result.current.favorites.size).toBe(0);
    });

    it("adds an acronym on first toggle and stores it", () => {
        const { result } = renderHook(() => useFavoriteMods());

        act(() => result.current.toggleFavorite("DT"));

        expect(result.current.favorites.has("DT")).toBe(true);
        expect(readStoredFavorites()).toEqual(["DT"]);
    });

    it("removes an acronym on a second toggle and stores the removal", () => {
        const { result } = renderHook(() => useFavoriteMods());

        act(() => result.current.toggleFavorite("DT"));
        act(() => result.current.toggleFavorite("DT"));

        expect(result.current.favorites.has("DT")).toBe(false);
        expect(readStoredFavorites()).toEqual([]);
    });

    it("keeps working in memory when storage throws", () => {
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("blocked");
        });

        const { result } = renderHook(() => useFavoriteMods());

        act(() => result.current.toggleFavorite("HD"));

        expect(result.current.favorites.has("HD")).toBe(true);

        vi.restoreAllMocks();
    });
});
