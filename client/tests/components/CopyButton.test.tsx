import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "../../src/components/CopyButton";

describe("CopyButton", () => {
    it("copies its text and confirms", async () => {
        const user = userEvent.setup();
        const writeText = vi.spyOn(navigator.clipboard, "writeText");

        render(<CopyButton text="https://example.com/s/abc" label="Copy link" />);

        await user.click(screen.getByRole("button", { name: "Copy link" }));

        expect(writeText).toHaveBeenCalledWith("https://example.com/s/abc");
        expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    });

    it("does not throw when the clipboard refuses", async () => {
        const user = userEvent.setup();
        vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));

        render(<CopyButton text="x" label="Copy link" />);

        await user.click(screen.getByRole("button", { name: "Copy link" }));

        expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    });
});
