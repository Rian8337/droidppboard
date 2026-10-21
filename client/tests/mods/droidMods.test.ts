import {
    ModAutopilot,
    ModRelax,
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
    hasModIcon,
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

    it("excludes mods outside the selectable catalog (e.g. Autoplay)", () => {
        const mods = getSelectableDroidMods();

        expect(mods.some((m) => m.acronym === "AT")).toBe(false);
    });

    it("offers Replay V6 in a System category after every other, though it isn't user-playable", () => {
        const groups = groupModsByCategory(getSelectableDroidMods());
        const last = groups[groups.length - 1];

        expect(last.category).toBe("System");
        expect(last.mods.map((m) => m.acronym)).toEqual(["RV6"]);
    });

    it("offers only ranked mods, apart from Replay V6", () => {
        const unranked = getSelectableDroidMods()
            .filter((m) => m.isApplicableToDroid() && !m.droidRanked)
            .map((m) => m.acronym);

        expect(unranked).toEqual(["RV6"]);
    });

    it("leaves out unranked mods such as Autopilot, Relax and Difficulty Adjust", () => {
        const acronyms = getSelectableDroidMods().map((m) => m.acronym);

        expect(acronyms).not.toContain("AP");
        expect(acronyms).not.toContain("RX");
        expect(acronyms).not.toContain("DA");
    });

    it("offers Perfect and Sudden Death in Difficulty Increase, in the game client's order", () => {
        const groups = groupModsByCategory(getSelectableDroidMods());
        const increase = groups.find((g) => g.category === "Difficulty Increase")!;

        expect(increase.mods.map((m) => m.acronym)).toEqual([
            "DT",
            "FL",
            "HR",
            "HD",
            "NC",
            "PF",
            "PR",
            "SD",
        ]);
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

describe("hasModIcon", () => {
    it("is true for a mod with an icon in public/icons/mods", () => {
        expect(hasModIcon("HD")).toBe(true);
    });

    it("is false for Replay V6, which the game client gives no icon either", () => {
        expect(hasModIcon("RV6")).toBe(false);
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

describe("selecting Automation mods", () => {
    it("selecting Relax deselects Autopilot", () => {
        const next = selectMod([new ModAutopilot()], new ModRelax());

        expect(next.map((m) => m.acronym)).toEqual(["RX"]);
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
