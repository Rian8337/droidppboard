import { fireEvent, render, screen, within } from "@testing-library/react";
import type { SerializedMod } from "@rian8337/osu-base";
import { useState } from "react";
import { ModPicker } from "../../src/mods/ModPicker";

function openPicker() {
    fireEvent.click(screen.getByRole("button", { name: /select mods/i }));
}

function typeSearch(query: string) {
    fireEvent.change(screen.getByPlaceholderText("Search mods..."), {
        target: { value: query },
    });
}

beforeEach(() => localStorage.clear());

/** A picker that feeds its own selection back in, as the score filters do. */
function ControlledPicker({ onChange }: { onChange: (mods: readonly SerializedMod[]) => void }) {
    const [mods, setMods] = useState<readonly SerializedMod[]>([]);

    return (
        <ModPicker
            mods={mods}
            onChange={(next) => {
                setMods(next);
                onChange(next);
            }}
        />
    );
}

describe("ModPicker", () => {
    it("shows a closed 'Select mods' trigger by default", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        expect(screen.getByRole("button", { name: /select mods/i })).toBeInTheDocument();
        expect(screen.queryByRole("group", { name: "Mods" })).not.toBeInTheDocument();
    });

    it("shows the selected mods' acronyms on the trigger instead of the placeholder", () => {
        render(<ModPicker mods={[{ acronym: "HD" }, { acronym: "DT" }]} onChange={vi.fn()} />);

        expect(screen.getByText("HD, DT")).toBeInTheDocument();
    });

    it("styles the placeholder text distinctly from an actual selection", () => {
        const { rerender } = render(<ModPicker mods={[]} onChange={vi.fn()} />);

        const placeholderClass = screen.getByText("Select mods").className;

        rerender(<ModPicker mods={[{ acronym: "HD" }]} onChange={vi.fn()} />);

        const selectedClass = screen.getByText("HD").className;

        expect(placeholderClass).not.toBe(selectedClass);
    });

    it("opens the checklist and renders a checkbox for every selectable mod", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();

        expect(screen.getByRole("checkbox", { name: /hidden/i })).toBeInTheDocument();
        expect(screen.getByRole("checkbox", { name: /double time/i })).toBeInTheDocument();
    });

    it("marks currently-selected mods as checked", () => {
        render(<ModPicker mods={[{ acronym: "HD" }]} onChange={vi.fn()} />);

        openPicker();

        expect(screen.getByRole("checkbox", { name: /hidden/i })).toBeChecked();
        expect(screen.getByRole("checkbox", { name: /double time/i })).not.toBeChecked();
    });

    it("calls onChange with the mod added when an unselected checkbox is checked", () => {
        const onChange = vi.fn();
        render(<ModPicker mods={[]} onChange={onChange} />);

        openPicker();
        fireEvent.click(screen.getByRole("checkbox", { name: /hidden/i }));

        expect(onChange).toHaveBeenCalledWith([{ acronym: "HD" }]);
    });

    it("calls onChange with the mod removed when a selected checkbox is unchecked", () => {
        const onChange = vi.fn();
        render(<ModPicker mods={[{ acronym: "HD" }]} onChange={onChange} />);

        openPicker();
        fireEvent.click(screen.getByRole("checkbox", { name: /hidden/i }));

        expect(onChange).toHaveBeenCalledWith([]);
    });

    it("auto-deselects an incompatible mod when a conflicting one is selected", () => {
        const onChange = vi.fn();
        render(<ModPicker mods={[{ acronym: "HT" }]} onChange={onChange} />);

        openPicker();
        fireEvent.click(screen.getByRole("checkbox", { name: /double time/i }));

        expect(onChange).toHaveBeenCalledWith([{ acronym: "DT" }]);
    });

    it("selecting DT deselects HT", () => {
        const onChange = vi.fn();
        render(<ControlledPicker onChange={onChange} />);

        openPicker();
        fireEvent.click(screen.getByRole("checkbox", { name: /half time/i }));
        fireEvent.click(screen.getByRole("checkbox", { name: /double time/i }));

        expect(onChange).toHaveBeenLastCalledWith([{ acronym: "DT" }]);
        expect(screen.getByRole("checkbox", { name: /half time/i })).not.toBeChecked();
        expect(screen.getByRole("checkbox", { name: /double time/i })).toBeChecked();
        expect(screen.getByText("DT")).toBeInTheDocument();
    });

    it("selecting HR deselects EZ", () => {
        const onChange = vi.fn();
        render(<ControlledPicker onChange={onChange} />);

        openPicker();
        fireEvent.click(screen.getByRole("checkbox", { name: /easy/i }));
        fireEvent.click(screen.getByRole("checkbox", { name: /hard rock/i }));

        expect(onChange).toHaveBeenLastCalledWith([{ acronym: "HR" }]);
        expect(screen.getByRole("checkbox", { name: /easy/i })).not.toBeChecked();
    });

    it("does not offer unranked mods", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();

        expect(screen.queryByRole("checkbox", { name: /relax/i })).not.toBeInTheDocument();
        expect(
            screen.queryByRole("checkbox", { name: /difficulty adjust/i }),
        ).not.toBeInTheDocument();
    });

    it("names the trigger by its selection so screen readers hear the chosen mods", () => {
        const { rerender } = render(<ModPicker mods={[]} onChange={vi.fn()} />);

        expect(screen.getByRole("button", { name: "Select mods" })).toBeInTheDocument();

        rerender(<ModPicker mods={[{ acronym: "HD" }, { acronym: "DT" }]} onChange={vi.fn()} />);

        expect(screen.getByRole("button", { name: /^Select mods.*HD, DT/ })).toBeInTheDocument();
    });

    it("hides settings when hasSettings is false", () => {
        render(
            <ModPicker
                mods={[{ acronym: "CS" }, { acronym: "DA" }]}
                hasSettings={false}
                onChange={vi.fn()}
            />,
        );

        expect(screen.queryByTestId("mod-settings-CS")).not.toBeInTheDocument();
        expect(screen.queryByTestId("mod-settings-DA")).not.toBeInTheDocument();
        expect(screen.getByText("CS, DA")).toBeInTheDocument();
    });

    it("loads mod icons from /icons/mods", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();

        const icon = screen
            .getByRole("checkbox", { name: /hidden/i })
            .parentElement!.querySelector("img");

        expect(icon).toHaveAttribute("src", "/icons/mods/HD.png");
    });

    it("shows the acronym in place of an icon for a mod without one, as the game client does", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();

        const label = screen.getByRole("checkbox", { name: /replay v6/i }).parentElement!;

        expect(label.querySelector("img")).toBeNull();
        expect(within(label).getByText("RV6")).toHaveAttribute("aria-hidden", "true");
    });

    it("closes the checklist on Escape", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();
        expect(screen.getByRole("group", { name: "Mods" })).toBeInTheDocument();

        fireEvent.keyDown(document, { key: "Escape" });

        expect(screen.queryByRole("group", { name: "Mods" })).not.toBeInTheDocument();
    });

    it("closes the checklist on an outside click", () => {
        render(
            <div>
                <div data-testid="outside" />
                <ModPicker mods={[]} onChange={vi.fn()} />
            </div>,
        );

        openPicker();
        expect(screen.getByRole("group", { name: "Mods" })).toBeInTheDocument();

        fireEvent.mouseDown(screen.getByTestId("outside"));

        expect(screen.queryByRole("group", { name: "Mods" })).not.toBeInTheDocument();
    });

    it("uses the full default panel height when there's ample room below the trigger", () => {
        // jsdom's getBoundingClientRect always returns an all-zero rect (no real layout engine),
        // so "trigger.bottom" reads as 0 here - the same as a trigger pinned to the very top of
        // the viewport, i.e. maximum available room. This is the baseline every other test in
        // this file already relies on implicitly.
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();

        expect(screen.getByRole("group", { name: "Mods" })).toHaveStyle({ maxHeight: "260px" });
    });

    it("caps the panel's height to the room actually available below the trigger", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        const trigger = screen.getByRole("button", { name: /select mods/i });

        // Simulates the trigger sitting close to the bottom of the viewport: only 50px free
        // below it before the viewport margin, well under the default 260px panel height.
        vi.spyOn(trigger.parentElement!, "getBoundingClientRect").mockReturnValue({
            bottom: window.innerHeight - 50,
        } as DOMRect);

        fireEvent.click(trigger);

        // 50px free minus the 12px viewport margin = 38px, below the 120px floor - clamped up
        // to the floor rather than shrinking further.
        expect(screen.getByRole("group", { name: "Mods" })).toHaveStyle({ maxHeight: "120px" });
    });

    it("shifts the panel left when the trigger is too close to the right edge", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        const trigger = screen.getByRole("button", { name: /select mods/i });

        vi.spyOn(trigger.parentElement!, "getBoundingClientRect").mockReturnValue({
            bottom: 0,
            left: window.innerWidth - 100,
        } as DOMRect);

        fireEvent.click(trigger);

        // The 320px panel ends 12px short of the viewport edge: 1024 - 12 - 320 = 692.
        expect(screen.getByRole("group", { name: "Mods" }).parentElement).toHaveStyle({
            left: `${692 - (window.innerWidth - 100)}px`,
        });
    });

    it("leaves the panel under the trigger when there is room", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();

        expect(screen.getByRole("group", { name: "Mods" }).parentElement).toHaveStyle({
            left: "0px",
        });
    });

    it("never pushes the panel past the left edge on a narrow screen", () => {
        const originalWidth = window.innerWidth;
        window.innerWidth = 300;

        try {
            render(<ModPicker mods={[]} onChange={vi.fn()} />);

            const trigger = screen.getByRole("button", { name: /select mods/i });

            vi.spyOn(trigger.parentElement!, "getBoundingClientRect").mockReturnValue({
                bottom: 0,
                left: 250,
            } as DOMRect);

            fireEvent.click(trigger);

            // The panel is 300 - 32 = 268px wide here, so its left edge lands at 300 - 12 - 268 = 20.
            expect(screen.getByRole("group", { name: "Mods" }).parentElement).toHaveStyle({
                left: `${20 - 250}px`,
            });
        } finally {
            window.innerWidth = originalWidth;
        }
    });

    it("shows a settings block for a selected mod with a numeric setting, updating its value", () => {
        // ModCustomSpeed ("CS") has one numeric setting (DecimalModSetting), verified directly
        // against the installed osu-base source: name "Track rate multiplier", key
        // "rateMultiplier", default 1, range [0.5, 2].
        const onChange = vi.fn();
        render(<ModPicker mods={[{ acronym: "CS" }]} onChange={onChange} />);

        const settings = screen.getByTestId("mod-settings-CS");
        const rateInput = within(settings).getByLabelText(/track rate multiplier/i);

        fireEvent.change(rateInput, { target: { value: "1.25" } });

        expect(onChange).toHaveBeenCalledWith([
            { acronym: "CS", settings: { rateMultiplier: 1.25 } },
        ]);
    });

    it("renders an EnumModSetting as a <select> with formatted option labels, updating its value", () => {
        // ModMirror ("MR") has one EnumModSetting (flippedAxes), verified directly against the
        // installed osu-base source: name "Flipped axes", key "flippedAxes", entries
        // [Axes.X, Axes.Y, Axes.Both] (0, 1, 2), default Axes.X (index 0).
        const onChange = vi.fn();
        render(<ModPicker mods={[{ acronym: "MR" }]} onChange={onChange} />);

        const settings = screen.getByTestId("mod-settings-MR");
        const axesSelect = within(settings).getByLabelText(/flipped axes/i);

        expect(within(settings).getAllByRole("option")).toHaveLength(3);

        fireEvent.change(axesSelect, { target: { value: "1" } });

        expect(onChange).toHaveBeenCalledWith([{ acronym: "MR", settings: { flippedAxes: 1 } }]);
    });

    it("does not leak a setting change into a later change's onChange call when `mods` never round-trips back in", () => {
        // ModFlashlight ("FL") has two DecimalModSettings, verified directly against the
        // installed osu-base source: "Flashlight follow delay" (key "areaFollowDelay", default
        // 0.12, step 0.12 - 0.48 is an exact step multiple, avoiding snap-rounding surprises) and
        // "Flashlight size" (key "sizeMultiplier", default 1). Regression test for mutating a
        // `useMemo`'d mod in place: without `mods` ever being fed back in between the two changes
        // below (as would happen if a real onChange consumer round-tripped it), the internally-
        // memoized `selected` array never recomputes - so a buggy in-place mutation of the first
        // change would still be sitting on the same object when the second change reads it,
        // corrupting the second onChange call with a setting the operator never touched in this
        // render.
        const onChange = vi.fn();
        render(<ModPicker mods={[{ acronym: "FL" }]} onChange={onChange} />);

        const settings = screen.getByTestId("mod-settings-FL");
        const followDelayInput = within(settings).getByLabelText(/flashlight follow delay/i);
        const sizeInput = within(settings).getByLabelText(/flashlight size/i);

        fireEvent.change(followDelayInput, { target: { value: "0.48" } });

        expect(onChange).toHaveBeenLastCalledWith([
            { acronym: "FL", settings: { areaFollowDelay: 0.48 } },
        ]);

        fireEvent.change(sizeInput, { target: { value: "1.5" } });

        expect(onChange).toHaveBeenLastCalledWith([
            { acronym: "FL", settings: { sizeMultiplier: 1.5 } },
        ]);
    });

    it("shows a null-valued numeric setting as an empty, 'Default'-hinted field rather than the literal text 'null'", () => {
        // Difficulty Adjust ("DA")'s cs/ar/od/hp settings (DifficultyAdjustModSetting, a
        // NullableDecimalModSetting) default to `null`, meaning "no override" - verified directly
        // against the installed osu-base source.
        const onChange = vi.fn();
        render(<ModPicker mods={[{ acronym: "DA" }]} onChange={onChange} />);

        const settings = screen.getByTestId("mod-settings-DA");
        const csInput = within(settings).getByLabelText<HTMLInputElement>(/circle size/i);

        expect(csInput.value).toBe("");
        expect(csInput.placeholder).toBe("Default");

        fireEvent.change(csInput, { target: { value: "4" } });

        expect(onChange).toHaveBeenLastCalledWith([{ acronym: "DA", settings: { cs: 4 } }]);
    });

    it("clears an explicitly-set numeric setting back to its null default when its field is emptied", () => {
        const onChange = vi.fn();
        render(<ModPicker mods={[{ acronym: "DA", settings: { cs: 4 } }]} onChange={onChange} />);

        const settings = screen.getByTestId("mod-settings-DA");
        const csInput = within(settings).getByLabelText<HTMLInputElement>(/circle size/i);

        expect(csInput.value).toBe("4");

        fireEvent.change(csInput, { target: { value: "" } });

        // Every DifficultyAdjust setting is back to its null default, so `Mod.serialize()` omits
        // the `settings` key entirely rather than emitting an empty object.
        expect(onChange).toHaveBeenLastCalledWith([{ acronym: "DA" }]);
    });

    it("shows no settings block for a mod with no settings", () => {
        // NoFail ("NF") has zero settings, verified directly against the installed osu-base
        // source. Hidden ("HD"), the brief's original example, gained an
        // "Only fade approach circles" BooleanModSetting in a later osu-base version than the
        // brief was written against, so it no longer fits this case - see task-8-report.md.
        render(<ModPicker mods={[{ acronym: "NF" }]} onChange={vi.fn()} />);

        expect(screen.queryByTestId("mod-settings-NF")).not.toBeInTheDocument();
    });

    it("keeps the settings block visible for a selected mod even while the checklist is closed", () => {
        render(<ModPicker mods={[{ acronym: "CS" }]} onChange={vi.fn()} />);

        expect(screen.getByTestId("mod-settings-CS")).toBeInTheDocument();
    });

    it("filters the checklist by acronym or name as the operator types", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();
        typeSearch("double");

        expect(screen.getByRole("checkbox", { name: /double time/i })).toBeInTheDocument();
        expect(screen.queryByRole("checkbox", { name: /hidden/i })).not.toBeInTheDocument();
    });

    it("shows an empty-state message when the search matches nothing", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();
        typeSearch("nonexistent mod");

        expect(screen.getByText("No mods match your search.")).toBeInTheDocument();
        expect(screen.queryByRole("group", { name: "Mods" })).not.toBeInTheDocument();
    });

    it("clears the search when the checklist is closed and reopened", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();
        typeSearch("double");
        fireEvent.keyDown(document, { key: "Escape" });

        openPicker();

        expect(screen.getByPlaceholderText("Search mods...")).toHaveValue("");
        expect(screen.getByRole("checkbox", { name: /hidden/i })).toBeInTheDocument();
    });

    it("has no favorited mods by default", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();

        expect(screen.queryByText("Favorites")).not.toBeInTheDocument();
    });

    it("adds a mod to a pinned Favorites section when its star is toggled", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();
        fireEvent.click(screen.getByRole("button", { name: /favorite hidden/i }));

        expect(screen.getByText("Favorites")).toBeInTheDocument();
        // Still appears in its own category section too, not moved out of it - both rows'
        // stars now read "Unfavorite" since they reflect the same underlying favorite state.
        expect(screen.getAllByRole("checkbox", { name: /hidden/i })).toHaveLength(2);
        expect(screen.getAllByRole("button", { name: /unfavorite hidden/i })).toHaveLength(2);
    });

    it("removes a mod from the Favorites section when unfavorited", () => {
        render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();
        fireEvent.click(screen.getByRole("button", { name: /favorite hidden/i }));

        const [firstUnfavoriteButton] = screen.getAllByRole("button", {
            name: /unfavorite hidden/i,
        });
        fireEvent.click(firstUnfavoriteButton);

        expect(screen.queryByText("Favorites")).not.toBeInTheDocument();
        expect(screen.getAllByRole("checkbox", { name: /hidden/i })).toHaveLength(1);
    });

    it("persists favorites across remounts", () => {
        const { unmount } = render(<ModPicker mods={[]} onChange={vi.fn()} />);

        openPicker();
        fireEvent.click(screen.getByRole("button", { name: /favorite hidden/i }));
        unmount();

        render(<ModPicker mods={[]} onChange={vi.fn()} />);
        openPicker();

        expect(screen.getByText("Favorites")).toBeInTheDocument();
    });

    it("still toggles the mod's selection when its checkbox is clicked from the Favorites section", () => {
        const onChange = vi.fn();
        render(<ModPicker mods={[]} onChange={onChange} />);

        openPicker();
        fireEvent.click(screen.getByRole("button", { name: /favorite hidden/i }));

        const [favoriteCheckbox] = screen.getAllByRole("checkbox", { name: /hidden/i });
        fireEvent.click(favoriteCheckbox);

        expect(onChange).toHaveBeenCalledWith([{ acronym: "HD" }]);
    });
});
