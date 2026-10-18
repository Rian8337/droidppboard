import { favoriteModsStorageKey, readFavoriteMods } from "../../src/mods/favoriteModsStorage";

describe("favoriteModsStorage", () => {
    it("keeps the favorites under the key the streaming client used", () => {
        expect(favoriteModsStorageKey).toBe("favorite-mods");
    });

    it("returns an empty array when nothing is stored", () => {
        expect(readFavoriteMods(undefined)).toEqual([]);
        expect(readFavoriteMods(null)).toEqual([]);
    });

    it("returns a stored list of acronyms", () => {
        expect(readFavoriteMods(["DT", "HD"])).toEqual(["DT", "HD"]);
    });

    it("returns an empty array when the stored value is not a list", () => {
        expect(readFavoriteMods("DT")).toEqual([]);
        expect(readFavoriteMods({ DT: true })).toEqual([]);
    });

    it("returns an empty array when the stored list holds anything but text", () => {
        expect(readFavoriteMods(["DT", 5])).toEqual([]);
    });
});
