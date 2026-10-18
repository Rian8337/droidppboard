import { render, screen } from "@testing-library/react";
import { CountryFlag } from "../../src/components/CountryFlag";

describe("CountryFlag", () => {
    it("shows the flag for a country code, whatever its case", () => {
        render(<CountryFlag code="id" />);

        expect(screen.getByRole("img", { name: "ID" })).toHaveTextContent("🇮🇩");
    });

    it("shows nothing for a code that is not two letters", () => {
        const { container } = render(<CountryFlag code="Indonesia" />);

        expect(container).toBeEmptyDOMElement();
    });
});
