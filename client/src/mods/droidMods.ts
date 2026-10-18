import { Mod, ModUtil, type SerializedMod } from "@rian8337/osu-base";

/**
 * The osu!droid game client's own mod-menu category order (`ModType.kt`).
 */
export const MOD_CATEGORY_ORDER = [
    "Difficulty Reduction",
    "Difficulty Increase",
    "Automation",
    "Conversion",
    "Fun",
    "System",
] as const;

export type ModCategory = (typeof MOD_CATEGORY_ORDER)[number];

/**
 * The full catalog of selectable acronyms, grouped by the game client's mod-menu category
 * (`ModMenu.kt`) and, within each category, ordered exactly as the game client declares them
 * (`Mods.kt`'s `allModsInstances`, filtered to this app's selectable set). An acronym not listed
 * here is never offered. Every listed acronym has an icon in `public/icons/mods` except those in
 * {@link ACRONYMS_WITHOUT_ICON}.
 *
 * Autoplay ("AT") is deliberately not listed: it is not a mod to filter scores by. Replay V6
 * ("RV6") is listed although it isn't user-playable: it marks scores set on replay version 6 or
 * older, which are worth filtering by.
 */
const SELECTABLE_MODS: readonly {
    readonly category: ModCategory;
    readonly acronyms: readonly string[];
}[] = [
    { category: "Difficulty Reduction", acronyms: ["EZ", "HT", "NF", "RE"] },
    {
        category: "Difficulty Increase",
        acronyms: ["DT", "FL", "HR", "HD", "NC", "PF", "PR", "SD", "TC"],
    },
    { category: "Automation", acronyms: ["AP", "RX"] },
    { category: "Conversion", acronyms: ["CS", "DA", "MR", "RD", "V2"] },
    { category: "Fun", acronyms: ["AD", "FR", "MU", "SY", "WD", "WU"] },
    { category: "System", acronyms: ["RV6"] },
];

/**
 * The listed acronyms with no icon in `public/icons/mods`. The game client has none for these
 * either; it draws the acronym instead (`ModIcon.kt`), and so does the mod picker.
 */
const ACRONYMS_WITHOUT_ICON: ReadonlySet<string> = new Set(["RV6"]);

const CATEGORY_BY_ACRONYM = new Map<string, ModCategory>(
    SELECTABLE_MODS.flatMap((group) => group.acronyms.map((acronym) => [acronym, group.category])),
);

/**
 * Every acronym in {@link SELECTABLE_MODS}, flattened to display order.
 */
const SELECTABLE_ACRONYMS_IN_ORDER = SELECTABLE_MODS.flatMap((group) => group.acronyms);

/**
 * Whether the mod with the given acronym has an icon in `public/icons/mods`.
 */
export function hasModIcon(acronym: string): boolean {
    return !ACRONYMS_WITHOUT_ICON.has(acronym);
}

/**
 * Every mod selectable in the mod picker: applicable to osu!droid
 * (`Mod.isApplicableToDroid()`) and listed in {@link SELECTABLE_MODS}. Ordered by
 * {@link SELECTABLE_MODS} - category blocks matching the game client's own mod menu, in its
 * declaration order within each - rather than alphabetically. Returns fresh instances every call,
 * each at that mod's default settings - callers own their own copy to mutate freely.
 */
export function getSelectableDroidMods(): Mod[] {
    const instancesByAcronym = new Map<string, Mod>();

    for (const ModClass of ModUtil.allMods.values()) {
        const instance = new (ModClass as new () => Mod)();

        if (!instance.isApplicableToDroid()) {
            continue;
        }

        if (!CATEGORY_BY_ACRONYM.has(instance.acronym)) {
            continue;
        }

        instancesByAcronym.set(instance.acronym, instance);
    }

    return SELECTABLE_ACRONYMS_IN_ORDER.filter((acronym) => instancesByAcronym.has(acronym)).map(
        (acronym) => instancesByAcronym.get(acronym)!,
    );
}

/**
 * One category section of the mod picker's panel.
 */
export interface ModCategoryGroup {
    readonly category: ModCategory;
    readonly mods: readonly Mod[];
}

/**
 * Groups an already-{@link getSelectableDroidMods}-ordered list into category sections for
 * display, preserving both {@link SELECTABLE_MODS}'s category order and each mod's order within
 * its category. A category with no mods in `mods` is omitted entirely rather than rendered empty.
 */
export function groupModsByCategory(mods: readonly Mod[]): ModCategoryGroup[] {
    const modsByCategory = new Map<ModCategory, Mod[]>();

    for (const mod of mods) {
        const category = CATEGORY_BY_ACRONYM.get(mod.acronym)!;
        const group = modsByCategory.get(category);

        if (group) {
            group.push(mod);
        } else {
            modsByCategory.set(category, [mod]);
        }
    }

    return MOD_CATEGORY_ORDER.filter((category) => modsByCategory.has(category)).map(
        (category) => ({ category, mods: modsByCategory.get(category)! }),
    );
}

/**
 * Adds `toSelect` to `currentlySelected`, first removing every already-selected mod that's
 * incompatible with it (checked via `Mod.isCompatibleWith`, never `Mod.incompatibleMods`
 * directly - the latter only reflects one mod's own static declarations, not the full,
 * potentially-dynamic compatibility check).
 *
 * @param currentlySelected The mods currently selected.
 * @param toSelect The mod being added.
 * @returns The new selection.
 */
export function selectMod(currentlySelected: readonly Mod[], toSelect: Mod): Mod[] {
    const compatible = currentlySelected.filter((mod) => mod.isCompatibleWith(toSelect));

    return [...compatible, toSelect];
}

/**
 * Removes the mod with the given acronym from `currentlySelected`. A no-op (returns an
 * equivalent array) if no mod has that acronym.
 *
 * @param currentlySelected The mods currently selected.
 * @param acronym The acronym of the mod to remove.
 * @returns The new selection.
 */
export function deselectMod(currentlySelected: readonly Mod[], acronym: string): Mod[] {
    return currentlySelected.filter((mod) => mod.acronym !== acronym);
}

/**
 * The acronyms of `mods`, in order. Mod settings (a Custom Speed rate, Difficulty Adjust values)
 * are dropped: the score filters match on the mods alone.
 */
export function getSelectedAcronyms(mods: readonly SerializedMod[]): string[] {
    return mods.map((mod) => mod.acronym);
}
