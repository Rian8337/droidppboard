import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Tabs } from "../../src/components/Tabs";

describe("Tabs", () => {
    it("renders each tab as a link and marks the active one", () => {
        render(
            <MemoryRouter>
                <Tabs
                    activeId="leaderboard"
                    tabs={[
                        { id: "info", label: "Info", to: "/droid-rebalance" },
                        {
                            id: "leaderboard",
                            label: "Leaderboard",
                            to: "/droid-rebalance/leaderboard",
                        },
                    ]}
                />
            </MemoryRouter>,
        );

        const active = screen.getByRole("link", { name: "Leaderboard" });

        expect(active).toHaveAttribute("href", "/droid-rebalance/leaderboard");
        expect(active).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("link", { name: "Info" })).not.toHaveAttribute("aria-current");
    });
});
