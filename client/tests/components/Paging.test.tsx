import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Paging } from "../../src/components/Paging";

describe("Paging", () => {
    it("steps between pages and disables the ends", async () => {
        const onPageChange = vi.fn();
        const user = userEvent.setup();

        const { rerender } = render(<Paging page={1} onPageChange={onPageChange} hasNext />);

        expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
        await user.click(screen.getByRole("button", { name: "Next page" }));
        expect(onPageChange).toHaveBeenCalledWith(2);

        rerender(<Paging page={3} onPageChange={onPageChange} hasNext={false} />);

        expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
        await user.click(screen.getByRole("button", { name: "Previous page" }));
        expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("jumps to the page typed in", async () => {
        const onPageChange = vi.fn();
        const user = userEvent.setup();

        render(<Paging page={1} onPageChange={onPageChange} hasNext />);

        await user.type(screen.getByRole("spinbutton", { name: "Go to page" }), "7");
        await user.click(screen.getByRole("button", { name: "Go" }));
        expect(onPageChange).toHaveBeenLastCalledWith(7);
    });
});
