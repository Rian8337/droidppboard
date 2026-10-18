import {
    ModAutopilot,
    ModDoubleTime,
    ModEasy,
    ModHalfTime,
    ModHidden,
    ModNightCore,
} from "@rian8337/osu-base";
import {
    deselectMod,
    getSelectableDroidMods,
    getSelectedAcronyms,
    groupModsByCategory,
    selectMod,
} from "../../src/mods/droidMods";

describe("getSelectableDroidMods", () => {
    it("includes ordinary user-playable droid mods", () => {
        const mods = getSelectableDroidMods();
        const acronyms = mods.map((m) => m.acronym);

        expect(acronyms).toContain("HD");
        expect(acronyms).toContain("HR");
        expect(acronyms).toContain("DT");
        expect(acronyms).toContain("HT");
    });

    it("excludes mods with no known icon (e.g. Autoplay)", () => {
        const mods = getSelectableDroidMods();

        expect(mods.some((m) => m.acronym === "AT")).toBe(false);
    });

    it("excludes non-user-playable mods (e.g. Replay V6)", () => {
        const mods = getSelectableDroidMods();

        expect(mods.some((m) => m.acronym === "RV6")).toBe(false);
    });

    it("excludes mods incompatible with autoplay (Autopilot, Relax)", () => {
        // The demo always plays a synthetic autoplay - Autopilot/Relax alter how a *human*
        // player's cursor/clicks behave, which osu-base's own ModAuto.isCompatibleWith already
        // treats as incompatible. Both have known icons and are otherwise user-playable, so
        // without this exclusion they'd still show up here.
        const mods = getSelectableDroidMods();
        const acronyms = mods.map((m) => m.acronym);

        expect(acronyms).not.toContain("AP");
        expect(acronyms).not.toContain("RX");
    });

    it("returns fresh instances each call, not shared references", () => {
        const first = getSelectableDroidMods();
        const second = getSelectableDroidMods();

        const firstHd = first.find((m) => m.acronym === "HD")!;
        const secondHd = second.find((m) => m.acronym === "HD")!;

        expect(firstHd).not.toBe(secondHd);
    });

    it("orders mods by the game client's mod-menu category, not alphabetically", () => {
        // Difficulty Reduction (e.g. EZ) comes before Difficulty Increase (e.g. DT) in the game
        // client's mod menu, the opposite of alphabetical order.
        const acronyms = getSelectableDroidMods().map((m) => m.acronym);

        expect(acronyms.indexOf("EZ")).toBeLessThan(acronyms.indexOf("DT"));
    });
});

describe("groupModsByCategory", () => {
    it("groups mods into their game-client category, preserving each mod's given order", () => {
        const groups = groupModsByCategory([
            new ModEasy(),
            new ModDoubleTime(),
            new ModAutopilot(),
        ]);

        expect(groups.map((g) => g.category)).toEqual([
            "Difficulty Reduction",
            "Difficulty Increase",
            "Automation",
        ]);
        expect(groups[0].mods.map((m) => m.acronym)).toEqual(["EZ"]);
    });

    it("omits categories with no mods in the input", () => {
        const groups = groupModsByCategory([new ModEasy()]);

        expect(groups).toEqual([{ category: "Difficulty Reduction", mods: [expect.anything()] }]);
    });

    it("places every mod from getSelectableDroidMods into exactly one group, same order", () => {
        const mods = getSelectableDroidMods();
        const grouped = groupModsByCategory(mods).flatMap((g) => g.mods);

        expect(grouped.map((m) => m.acronym)).toEqual(mods.map((m) => m.acronym));
    });
});

describe("selectMod", () => {
    it("appends a compatible mod to the current selection", () => {
        const current = [new ModHidden()];
        const next = selectMod(current, new ModDoubleTime());

        expect(next).toHaveLength(2);
    });

    it("removes every already-selected mod incompatible with the new one", () => {
        const current = [new ModHalfTime(), new ModNightCore()];
        const next = selectMod(current, new ModDoubleTime());

        expect(next.map((m) => m.acronym)).toEqual(["DT"]);
    });

    it("does not remove mods that remain compatible", () => {
        const current = [new ModHidden()];
        const next = selectMod(current, new ModDoubleTime());

        expect(next.map((m) => m.acronym).sort()).toEqual(["DT", "HD"]);
    });
});

describe("deselectMod", () => {
    it("removes the mod with the given acronym", () => {
        const current = [new ModHidden(), new ModDoubleTime()];
        const next = deselectMod(current, "HD");

        expect(next.map((m) => m.acronym)).toEqual(["DT"]);
    });

    it("is a no-op when no mod has that acronym", () => {
        const current = [new ModHidden()];
        const next = deselectMod(current, "DT");

        expect(next.map((m) => m.acronym)).toEqual(["HD"]);
    });
});

describe("getSelectedAcronyms", () => {
    it("lists the acronyms of the selected mods in order, ignoring their settings", () => {
        expect(
            getSelectedAcronyms([{ acronym: "HD" }, { acronym: "CS", settings: { rate: 1.3 } }]),
        ).toEqual(["HD", "CS"]);
    });

    it("lists nothing for no mods", () => {
        expect(getSelectedAcronyms([])).toEqual([]);
    });
});
