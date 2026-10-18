import { render, screen } from "@testing-library/react";
import { CountryFlag } from "../../src/components/CountryFlag";

describe("CountryFlag", () => {
    it("shows the flag of a known country, named after it", () => {
        render(<CountryFlag code="ID" />);

        const flag = screen.getByRole("img", { name: "Indonesia" });

        expect(flag).toBeVisible();
        expect(flag).toHaveAttribute("src", expect.stringMatching(/\/id(-[\w-]+)?\.svg/));
        expect(flag).not.toHaveAttribute("title");
    });

    it("accepts a lowercase code", () => {
        render(<CountryFlag code="jp" />);

        expect(screen.getByRole("img", { name: "Japan" })).toHaveAttribute(
            "src",
            expect.stringMatching(/\/jp(-[\w-]+)?\.svg/),
        );
    });

    it("is named after its code when the country has no name", () => {
        render(<CountryFlag code="XX" />);

        expect(screen.getByRole("img", { name: "XX" })).toBeVisible();
    });

    it("shows nothing for a country that has no flag", () => {
        const { container } = render(<CountryFlag code="ZZ" />);

        expect(container).toBeEmptyDOMElement();
    });

    it("shows nothing for no country", () => {
        const { container } = render(<CountryFlag code={null} />);

        expect(container).toBeEmptyDOMElement();
    });

    it("shows nothing for a code that is not two letters", () => {
        const { container } = render(
            <>
                <CountryFlag code="IDN" />
                <CountryFlag code="" />
                <CountryFlag code="1a" />
            </>,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
