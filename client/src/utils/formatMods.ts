import { ModUtil, type Mod, type SerializedMod } from "@rian8337/osu-base";

/**
 * Lists mods in the game's order, separated by commas, such as "HD, DT" or "CS (1.25x), RV6". A
 * mod's text can hold spaces and acronyms differ in length, so they are never run together.
 *
 * @param mods The mods, as the server sends them.
 * @returns The mods, or "NM" for none.
 */
export function formatMods(mods: readonly SerializedMod[]): string {
    const modMap = ModUtil.deserializeMods(mods);
    const texts: string[] = [];

    for (const modType of ModUtil.allMods.values()) {
        const mod = modMap.get(modType as new () => Mod);

        if (mod) {
            texts.push(mod.toString());
        }
    }

    return texts.length === 0 ? "NM" : texts.join(", ");
}
