import { screen } from "@testing-library/react";
import { InfoTab } from "../../src/variant/InfoTab";
import { buildVariant, droidRebalance } from "../mocks/fixtures";
import { renderWithProviders } from "../utils/renderWithProviders";

describe("InfoTab", () => {
    it("shows the variant's details", () => {
        renderWithProviders(<InfoTab variant={droidRebalance} />);

        expect(screen.getByText("droid-rebalance")).toBeVisible();
        expect(screen.getByText("rebalance")).toBeVisible();
        expect(screen.getByText("2026-10-11 13:16 UTC")).toBeVisible();
        expect(screen.getByText("1.0.0")).toBeVisible();
        expect(screen.getByText("Available")).toBeVisible();
    });

    it("shows the description before the details", () => {
        renderWithProviders(<InfoTab variant={droidRebalance} />);

        const description = screen.getByRole("region", { name: "Description" });

        expect(description).toHaveTextContent("The rebalanced osu!droid performance point system.");
        expect(
            description.compareDocumentPosition(screen.getByText("Internal name")) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it("omits what the variant does not have", () => {
        renderWithProviders(
            <InfoTab
                variant={buildVariant({
                    aliases: [],
                    builtAt: null,
                    calculatorVersion: null,
                    available: false,
                })}
            />,
        );

        expect(screen.queryByText("Aliases")).not.toBeInTheDocument();
        expect(screen.queryByText("Last updated")).not.toBeInTheDocument();
        expect(screen.queryByText("Calculator version")).not.toBeInTheDocument();
        expect(screen.getByText("Unavailable")).toBeVisible();
    });

    it("links the help text to this variant's Leaderboard and Queue tabs and to Discord", () => {
        renderWithProviders(<InfoTab variant={droidRebalance} />);

        expect(screen.getByRole("link", { name: "Leaderboard tab" })).toHaveAttribute(
            "href",
            "/v/droid-rebalance/leaderboard",
        );
        expect(screen.getByRole("link", { name: "Queue tab" })).toHaveAttribute(
            "href",
            "/v/droid-rebalance/queue",
        );
        expect(screen.getByRole("link", { name: "Discord" })).toHaveAttribute(
            "href",
            "https://discord.gg/nyD92cE",
        );
    });
});
