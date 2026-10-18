import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { DescriptionEditor } from "../../src/admin/DescriptionEditor";
import { maxVariantDescriptionLength } from "../../src/api/manage";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { VariantDescription } from "../../src/variant/VariantDescription";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

const source = [
    "## Warning: experiment",
    "",
    "Scores may change.",
    "",
    "Read the [changelog](https://example.com/changelog).",
].join("\n");

function Editor({ initial = "" }: { initial?: string }) {
    const [value, setValue] = useState(initial);

    return <DescriptionEditor value={value} onChange={setValue} />;
}

describe("DescriptionEditor", () => {
    it("shows the collapsed and the full description as the variant page does", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");

        render(<Editor initial={source} />);

        const collapsed = screen.getByRole("region", { name: "Before Show more" });
        const full = screen.getByRole("region", { name: "Full description" });

        expect(within(collapsed).getByText("Scores may change.")).toBeVisible();
        expect(
            within(collapsed).queryByRole("link", { name: "changelog" }),
        ).not.toBeInTheDocument();
        expect(within(full).getByRole("link", { name: "changelog" })).toBeVisible();

        // The variant page collapses the same source to the same blocks.
        const { unmount } = render(<VariantDescription description={source} />);
        const page = screen.getByRole("region", { name: "Description" });
        const getBlocks = (element: HTMLElement) =>
            [...element.querySelectorAll("h1,h2,h3,p")].map((block) => block.textContent);

        expect(getBlocks(collapsed)).toEqual(["Warning: experiment", "Scores may change."]);
        expect(getBlocks(page)).toEqual(getBlocks(collapsed));
        unmount();
    });

    it("says nothing is hidden when the description is a single block, even with CRLF line breaks", () => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");

        render(<Editor initial={"One block.\r\nOver two lines."} />);

        const collapsed = screen.getByRole("region", { name: "Before Show more" });

        expect(within(collapsed).getByText(/nothing is hidden/i)).toBeVisible();
    });

    it("shows side by side on a desktop, with no Write and Preview switch", () => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");

        render(<Editor initial="Hello." />);

        expect(screen.getByRole("textbox", { name: "Description" })).toBeVisible();
        expect(screen.getByRole("region", { name: "Full description" })).toBeVisible();
        expect(screen.queryByRole("radio", { name: "Preview" })).not.toBeInTheDocument();
    });

    it("switches between Write and Preview on a phone", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("phone");

        render(<Editor initial="Hello." />);

        expect(screen.getByRole("textbox", { name: "Description" })).toBeVisible();
        expect(screen.queryByRole("region", { name: "Full description" })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("radio", { name: "Preview" }));

        expect(screen.queryByRole("textbox", { name: "Description" })).not.toBeInTheDocument();
        expect(screen.getByRole("region", { name: "Full description" })).toBeVisible();

        await userEvent.click(screen.getByRole("radio", { name: "Write" }));

        expect(screen.getByRole("textbox", { name: "Description" })).toBeVisible();
    });

    it("counts the characters up to the limit", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");

        render(<Editor initial="abc" />);

        expect(screen.getByText(`3 / ${maxVariantDescriptionLength}`)).toBeVisible();

        await userEvent.type(screen.getByRole("textbox", { name: "Description" }), "de");

        expect(screen.getByText(`5 / ${maxVariantDescriptionLength}`)).toBeVisible();
    });

    it("links to a basic Markdown reference", () => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");

        render(<Editor />);

        expect(screen.getByRole("link", { name: "Markdown supported" })).toHaveAttribute(
            "href",
            "https://commonmark.org/help/",
        );
    });

    it("never renders raw HTML in the preview as something executable", () => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");

        const { container } = render(
            <Editor initial={'Safe.\n\n<img src=x onerror="alert(1)">'} />,
        );

        expect(container.querySelector("img")).toBeNull();
    });
});
