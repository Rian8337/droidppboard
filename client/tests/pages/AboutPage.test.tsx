import { screen } from "@testing-library/react";
import { AboutPage } from "../../src/pages/AboutPage";
import { renderWithProviders } from "../utils/renderWithProviders";

describe("AboutPage", () => {
    it("lists the donors under a Donor list heading", () => {
        renderWithProviders(<AboutPage />);

        expect(screen.getByRole("heading", { name: "Donor list" })).toBeVisible();
        expect(screen.getByText(/Tsukushi/)).toBeVisible();
    });

    it("links to the donation pages and the Discord server", () => {
        renderWithProviders(<AboutPage />);

        expect(screen.getByRole("link", { name: "PayPal" })).toHaveAttribute(
            "href",
            "https://paypal.me/Rian8337",
        );
        expect(screen.getByRole("link", { name: "Ko-fi" })).toHaveAttribute(
            "href",
            "https://ko-fi.com/rian8337",
        );
        expect(screen.getByRole("link", { name: /Discord/ })).toHaveAttribute(
            "href",
            "https://discord.gg/nyD92cE",
        );
    });
});
