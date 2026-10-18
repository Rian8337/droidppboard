import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getCollapsedDescription } from "../../src/variant/getCollapsedDescription";
import { VariantDescription } from "../../src/variant/VariantDescription";

const longDescription = [
    "## Warning: this is an experiment",
    "",
    "Scores may change at any time.",
    "",
    "Read the [changelog](https://example.com/changelog).",
].join("\n");

describe("getCollapsedDescription", () => {
    it("keeps only the first paragraph", () => {
        expect(getCollapsedDescription("First.\n\nSecond.")).toBe("First.");
    });

    it("keeps the paragraph after a leading heading", () => {
        expect(getCollapsedDescription(longDescription)).toBe(
            "## Warning: this is an experiment\n\nScores may change at any time.",
        );
    });

    it("keeps only the heading when nothing follows it", () => {
        expect(getCollapsedDescription("# Title")).toBe("# Title");
    });

    it("does not cut a fenced code block in the middle", () => {
        const source = "```\nline\n\nline\n```\n\nafter";

        expect(getCollapsedDescription(source)).toBe("```\nline\n\nline\n```");
    });

    it("returns a description of one block unchanged", () => {
        expect(getCollapsedDescription("Just one block.\nOver two lines.")).toBe(
            "Just one block.\nOver two lines.",
        );
    });

    it("ignores blank lines around the description", () => {
        expect(getCollapsedDescription("\n\nFirst.\n\nSecond.\n\n")).toBe("First.");
    });
});

describe("VariantDescription", () => {
    it("renders nothing without a description", () => {
        const { container } = render(<VariantDescription description={null} />);

        expect(container).toBeEmptyDOMElement();
    });

    it("shows the first block, then the rest on Show more and the first block again on Show less", async () => {
        render(<VariantDescription description={longDescription} />);

        expect(screen.getByText("Scores may change at any time.")).toBeVisible();
        expect(screen.queryByRole("link", { name: "changelog" })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Show more" }));

        expect(screen.getByRole("link", { name: "changelog" })).toBeVisible();

        await userEvent.click(screen.getByRole("button", { name: "Show less" }));

        expect(screen.queryByRole("link", { name: "changelog" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Show more" })).toBeVisible();
    });

    it("has no button when the collapsed description is the whole description", () => {
        render(<VariantDescription description="One paragraph." />);

        expect(screen.getByText("One paragraph.")).toBeVisible();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("never renders raw HTML as something executable", async () => {
        const { container } = render(
            <VariantDescription
                description={'Safe.\n\n<img src=x onerror="alert(1)">\n\n<script>alert(2)</script>'}
            />,
        );

        await userEvent.click(screen.getByRole("button", { name: "Show more" }));

        expect(container.querySelector("img")).toBeNull();
        expect(container.querySelector("script")).toBeNull();
        expect(container.querySelector("[onerror]")).toBeNull();
    });
});
