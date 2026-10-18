import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "../../src/components/Tooltip";

describe("Tooltip", () => {
    function renderTooltip() {
        render(
            <div>
                <Tooltip content="Recalculates every player">
                    <button type="button">Recalculate</button>
                </Tooltip>
                <p>Outside</p>
            </div>,
        );
    }

    it("is hidden until it is used", () => {
        renderTooltip();

        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("shows after a tap, with no hover involved", () => {
        renderTooltip();

        const button = screen.getByRole("button", { name: "Recalculate" });
        fireEvent.pointerDown(button, { pointerType: "touch" });
        fireEvent.click(button);

        expect(screen.getByRole("tooltip")).toHaveTextContent("Recalculates every player");
    });

    it("shows on keyboard focus and hides on blur", async () => {
        renderTooltip();

        await userEvent.tab();

        expect(screen.getByRole("tooltip")).toBeInTheDocument();

        await userEvent.tab();

        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("shows on mouse hover and hides when the pointer leaves", async () => {
        renderTooltip();

        const button = screen.getByRole("button", { name: "Recalculate" });
        await userEvent.hover(button);

        expect(screen.getByRole("tooltip")).toBeInTheDocument();

        await userEvent.unhover(button);

        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("hides on a press outside it", async () => {
        renderTooltip();

        fireEvent.click(screen.getByRole("button", { name: "Recalculate" }));
        await userEvent.click(screen.getByText("Outside"));

        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
});
