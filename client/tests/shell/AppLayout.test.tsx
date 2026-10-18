import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { AppLayout } from "../../src/shell/AppLayout";
import { renderWithProviders } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

function renderLayout(route = "/v/droid-rebalance/leaderboard") {
    return renderWithProviders(
        <Routes>
            <Route element={<AppLayout />}>
                <Route path="*" element={<p>The page</p>} />
            </Route>
        </Routes>,
        { route },
    );
}

describe("AppLayout", () => {
    it("shows the page next to an open sidebar on a desktop", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
        renderLayout();

        expect(screen.getByText("The page")).toBeVisible();
        expect(screen.getByRole("complementary")).toBeVisible();
        expect(screen.getByRole("button", { name: "Close menu" })).toBeVisible();

        await userEvent.click(screen.getByRole("button", { name: "Close menu" }));

        expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Open menu" })).toBeVisible();
    });

    it.each(["tablet", "phone"] as const)(
        "starts with the sidebar closed on a %s",
        async (size) => {
            vi.mocked(useBreakpoint).mockReturnValue(size);
            renderLayout();

            expect(screen.queryByRole("complementary")).not.toBeInTheDocument();

            await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

            expect(screen.getByRole("complementary")).toBeVisible();
            expect(screen.getByRole("button", { name: "Close menu" })).toBeVisible();
        },
    );

    it.each(["tablet", "phone"] as const)(
        "closes the sidebar after picking a variant on a %s",
        async (size) => {
            vi.mocked(useBreakpoint).mockReturnValue(size);
            renderLayout();

            await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
            await userEvent.click(await screen.findByRole("link", { name: /Reading/ }));

            expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
            expect(screen.getByText("The page")).toBeVisible();
        },
    );

    it("keeps the sidebar open after picking a variant on a desktop", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
        renderLayout();

        await userEvent.click(await screen.findByRole("link", { name: /Reading/ }));

        expect(screen.getByRole("complementary")).toBeVisible();
    });
});
