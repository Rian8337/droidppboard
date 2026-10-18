import { render, screen } from "@testing-library/react";
import { Markdown } from "../../src/components/Markdown";

describe("Markdown", () => {
    it("renders **bold** as <strong>", () => {
        const { container } = render(<Markdown source="This is **bold**" />);

        expect(container.querySelector("strong")).toHaveTextContent("bold");
    });

    it("does not render a raw <script>", () => {
        const { container } = render(<Markdown source="<script>alert(1)</script>" />);

        expect(container.querySelector("script")).toBeNull();
    });

    it("does not render a raw <img onerror>", () => {
        const { container } = render(<Markdown source="<img src=x onerror=alert(1)>" />);

        expect(container.querySelector("img")).toBeNull();
        expect(container.querySelector("[onerror]")).toBeNull();
    });

    it("opens links in a new tab without leaking the opener", () => {
        render(<Markdown source="[changelog](https://example.com/changelog)" />);

        const link = screen.getByRole("link", { name: "changelog" });

        expect(link).toHaveAttribute("href", "https://example.com/changelog");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("drops javascript: link targets", () => {
        render(<Markdown source="[bad](javascript:alert(1))" />);

        expect(screen.getByText("bad").closest("a")?.getAttribute("href") ?? "").not.toMatch(
            /javascript:/i,
        );
    });
});
