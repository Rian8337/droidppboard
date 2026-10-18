import { fireEvent, render, screen } from "@testing-library/react";
import { Dialog } from "../../src/components/Dialog";

describe("Dialog", () => {
    it("shows its title and content while open", () => {
        render(
            <Dialog title="Delete variant" isOpen onClose={() => {}}>
                <p>Are you sure?</p>
            </Dialog>,
        );

        expect(screen.getByRole("dialog", { name: "Delete variant" })).toBeInTheDocument();
        expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    });

    it("is not shown while closed", () => {
        render(
            <Dialog title="Delete variant" isOpen={false} onClose={() => {}}>
                <p>Are you sure?</p>
            </Dialog>,
        );

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("calls onClose when Escape asks the dialog to cancel", () => {
        const onClose = vi.fn();

        render(
            <Dialog title="Delete variant" isOpen onClose={onClose}>
                <p>Are you sure?</p>
            </Dialog>,
        );

        // Browsers turn Escape into a cancelable `cancel` event on the open dialog.
        const cancel = new Event("cancel", { cancelable: true });
        fireEvent(screen.getByRole("dialog"), cancel);

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(cancel.defaultPrevented).toBe(true);
    });

    it("calls onClose from its close button", () => {
        const onClose = vi.fn();

        render(
            <Dialog title="Delete variant" isOpen onClose={onClose}>
                <p>Are you sure?</p>
            </Dialog>,
        );

        fireEvent.click(screen.getByRole("button", { name: "Close" }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
