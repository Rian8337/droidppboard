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

    it("closes the sidebar when the backdrop of a tablet is pressed", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("tablet");
        const { container } = renderLayout();

        await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

        const backdrop = container.querySelector("div[aria-hidden=true]");

        expect(backdrop).toBeInTheDocument();

        await userEvent.click(backdrop!);

        expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    });

    it("closes the sidebar when the page next to it is clicked on a desktop", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
        renderLayout();

        await userEvent.click(screen.getByText("The page"));

        expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Open menu" })).toBeVisible();
    });

    it("keeps the sidebar open when it is clicked inside", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
        renderLayout();

        await userEvent.click(screen.getByRole("searchbox", { name: "Search reworks" }));

        expect(screen.getByRole("complementary")).toBeVisible();
    });

    it("keeps the page behind an open drawer from scrolling", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("phone");
        renderLayout();

        await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

        expect(document.documentElement.style.overflow).toBe("hidden");

        await userEvent.click(screen.getByRole("button", { name: "Close menu" }));

        expect(document.documentElement.style.overflow).toBe("");
    });

    it("lets the page scroll next to a desktop sidebar", () => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
        renderLayout();

        expect(document.documentElement.style.overflow).toBe("");
    });

    it("moves the focus to the toggle when a link in the drawer closes it", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("phone");
        renderLayout();

        await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
        await userEvent.click(screen.getByRole("link", { name: "Beatmap calculator" }));

        expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
    });

    it("has no backdrop on a phone", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("phone");
        const { container } = renderLayout();

        await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

        expect(container.querySelector("div[aria-hidden=true]")).not.toBeInTheDocument();
    });

    it("returns the sidebar to its default when the screen changes size", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("tablet");
        renderLayout();

        await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

        expect(screen.getByRole("complementary")).toBeVisible();

        // The screen grows to a desktop; the next render (here caused by the click) notices.
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
        await userEvent.click(screen.getByRole("button", { name: "Close menu" }));

        expect(screen.getByRole("complementary")).toBeVisible();
    });
});
