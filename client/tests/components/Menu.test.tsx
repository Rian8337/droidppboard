import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu } from "../../src/components/Menu";

describe("Menu", () => {
    function renderMenu(onSelect = vi.fn()) {
        render(
            <div>
                <Menu
                    trigger="Actions"
                    items={[
                        { label: "Rename", onSelect },
                        { label: "Delete", tone: "danger", onSelect: () => {} },
                    ]}
                />
                <p>Outside</p>
            </div>,
        );

        return onSelect;
    }

    it("is closed until the trigger is clicked", async () => {
        renderMenu();

        expect(screen.queryByRole("menu")).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Actions" }));

        expect(screen.getByRole("menu")).toBeInTheDocument();
        expect(screen.getAllByRole("menuitem")).toHaveLength(2);
    });

    it("closes on an outside press", async () => {
        renderMenu();

        await userEvent.click(screen.getByRole("button", { name: "Actions" }));
        await userEvent.click(screen.getByText("Outside"));

        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes on Escape and returns focus to the trigger", async () => {
        renderMenu();

        const trigger = screen.getByRole("button", { name: "Actions" });
        await userEvent.click(trigger);
        await userEvent.keyboard("{Escape}");

        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    it("calls onSelect and closes when an item is chosen", async () => {
        const onSelect = renderMenu();

        await userEvent.click(screen.getByRole("button", { name: "Actions" }));
        await userEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("moves focus between items with the arrow keys", async () => {
        renderMenu();

        await userEvent.click(screen.getByRole("button", { name: "Actions" }));
        await userEvent.keyboard("{ArrowDown}");

        expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus();

        await userEvent.keyboard("{ArrowDown}");

        expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    });
});
