import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes, useLocation } from "react-router";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { TopBar } from "../../src/shell/TopBar";
import { adminMe, managerMe, ownerMe } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

function LocationProbe() {
    const location = useLocation();

    return <p>{`${location.pathname} from ${JSON.stringify(location.state)}`}</p>;
}

function renderTopBar(route: string, me: Parameters<typeof renderWithProviders>[1]) {
    return renderWithProviders(
        <>
            <TopBar isSidebarOpen={false} onToggleSidebar={() => {}} />
            <Routes>
                <Route path="*" element={<LocationProbe />} />
            </Routes>
        </>,
        { route, ...me },
    );
}

describe("TopBar", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
    });

    it("toggles the sidebar with a button named for what it does", async () => {
        const onToggleSidebar = vi.fn();
        renderWithProviders(<TopBar isSidebarOpen={false} onToggleSidebar={onToggleSidebar} />);

        await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

        expect(onToggleSidebar).toHaveBeenCalledTimes(1);
    });

    it("offers closing the menu while the sidebar is open", () => {
        renderWithProviders(<TopBar isSidebarOpen onToggleSidebar={() => {}} />);

        expect(screen.getByRole("button", { name: "Close menu" })).toBeVisible();
    });

    it("titles a variant page with the variant's title", async () => {
        renderTopBar("/v/droid-rebalance/leaderboard", { me: null });

        expect(await screen.findByRole("heading", { name: "PP Board · Rebalance" })).toBeVisible();
    });

    it("titles a variant page with its name until the title is known", () => {
        renderTopBar("/v/some-variant/queue", { me: null });

        expect(screen.getByRole("heading", { name: "PP Board · some-variant" })).toBeVisible();
    });

    it("titles a variant page by the alias in the address", async () => {
        renderTopBar("/v/rebalance/leaderboard", { me: null });

        expect(await screen.findByRole("heading", { name: "PP Board · Rebalance" })).toBeVisible();
    });

    it("titles the browser tab after the variant, the page or the site", async () => {
        const variantTab = renderTopBar("/v/droid-rebalance/leaderboard", { me: null });

        await waitFor(() => expect(document.title).toBe("Rebalance · PP Board"));
        variantTab.unmount();

        const page = renderTopBar("/whitelist", { me: null });

        await waitFor(() => expect(document.title).toBe("Whitelist · PP Board"));
        page.unmount();

        renderTopBar("/", { me: null });

        await waitFor(() => expect(document.title).toBe("PP Board"));
    });

    it("titles other pages with the page name", () => {
        renderTopBar("/whitelist", { me: null });

        expect(screen.getByRole("heading", { name: "Whitelist" })).toBeVisible();
    });

    it.each(["/constructor", "/__proto__", "/toString/x", "/hasOwnProperty"])(
        "titles %s with the site name rather than something inherited",
        (route) => {
            renderTopBar(route, { me: null });

            expect(screen.getByRole("heading", { name: "PP Board" })).toBeVisible();
        },
    );

    it("links to the Discord server", () => {
        renderTopBar("/", { me: null });

        expect(screen.getByRole("link", { name: "Discord" })).toHaveAttribute(
            "href",
            "https://discord.gg/nyD92cE",
        );
    });

    describe("logged out", () => {
        it("offers logging in, which returns to the current page afterwards", async () => {
            renderTopBar("/v/reading/top-plays?sort=pp", { me: null });

            await userEvent.click(await screen.findByRole("link", { name: "Log in" }));

            expect(
                screen.getByText('/login from {"from":"/v/reading/top-plays?sort=pp"}'),
            ).toBeVisible();
        });
    });

    describe("logged in", () => {
        it("shows the avatar and the username", async () => {
            const { container } = renderTopBar("/", { me: adminMe });

            expect(await screen.findByRole("button", { name: /admin/ })).toBeVisible();
            expect(container.querySelector("header img")).toHaveAttribute(
                "src",
                "https://osudroid.moe/user/avatar?id=1",
            );
        });

        it("offers Admin to an admin", async () => {
            renderTopBar("/", { me: adminMe });

            await userEvent.click(await screen.findByRole("button", { name: /admin/ }));
            await userEvent.click(screen.getByRole("menuitem", { name: "Admin" }));

            expect(screen.getByText("/admin from null")).toBeVisible();
        });

        it("offers Admin to an owner", async () => {
            renderTopBar("/", { me: ownerMe });

            await userEvent.click(await screen.findByRole("button", { name: /owner/ }));

            expect(screen.getByRole("menuitem", { name: "Admin" })).toBeVisible();
        });

        it("does not offer Admin to a manager", async () => {
            renderTopBar("/", { me: managerMe });

            await userEvent.click(await screen.findByRole("button", { name: /manager/ }));

            expect(screen.getByRole("menuitem", { name: "Log out" })).toBeVisible();
            expect(screen.queryByRole("menuitem", { name: "Admin" })).not.toBeInTheDocument();
        });

        it("logs out through the server", async () => {
            const onLogout = vi.fn();
            server.use(
                http.post("/api/auth/logout", () => {
                    onLogout();

                    return new HttpResponse(null, { status: 204 });
                }),
            );
            renderTopBar("/", { me: adminMe });

            await userEvent.click(await screen.findByRole("button", { name: /admin/ }));
            await userEvent.click(screen.getByRole("menuitem", { name: "Log out" }));

            await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
        });

        it("shows a failed logout in the menu", async () => {
            server.use(
                http.post("/api/auth/logout", () =>
                    HttpResponse.json({ message: "Logout failed" }, { status: 500 }),
                ),
            );
            renderTopBar("/", { me: adminMe });

            await userEvent.click(await screen.findByRole("button", { name: /admin/ }));
            await userEvent.click(screen.getByRole("menuitem", { name: "Log out" }));

            expect(await screen.findByRole("alert")).toHaveTextContent("Logout failed");
            expect(screen.getByRole("menu")).toBeVisible();
        });

        it("does not show an earlier failed logout when the menu is opened again", async () => {
            server.use(
                http.post("/api/auth/logout", () =>
                    HttpResponse.json({ message: "Logout failed" }, { status: 500 }),
                ),
            );
            renderTopBar("/", { me: adminMe });

            await userEvent.click(await screen.findByRole("button", { name: /admin/ }));
            await userEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
            expect(await screen.findByRole("alert")).toBeVisible();

            await userEvent.keyboard("{Escape}");
            await userEvent.click(screen.getByRole("button", { name: /admin/ }));

            expect(screen.getByRole("menu")).toBeVisible();
            expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        });
    });
});
