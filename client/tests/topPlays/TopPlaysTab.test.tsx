import { renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createQueryClient } from "../../src/api/queryClient";
import { useTopPlays } from "../../src/api/topPlays";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { TopPlaysTab } from "../../src/topPlays/TopPlaysTab";
import { droidRebalance, readingVariant, topPlays } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

function recordRequests(): URL[] {
    const requests: URL[] = [];

    server.use(
        http.get("/api/ppboard/prototype/gettopplays", ({ request }) => {
            requests.push(new URL(request.url));

            return HttpResponse.json({
                variants: [droidRebalance, readingVariant],
                currentVariant: droidRebalance,
                data: topPlays,
            });
        }),
    );

    return requests;
}

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={createQueryClient({ retry: false })}>
            {children}
        </QueryClientProvider>
    );
}

describe("TopPlaysTab", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
        localStorage.clear();
    });

    it("shows every player's plays with the Player column", async () => {
        renderWithProviders(<TopPlaysTab variant={droidRebalance} />);

        expect(await screen.findByText("Alpha Song")).toBeVisible();
        expect(screen.getByRole("columnheader", { name: "Player" })).toBeVisible();
        expect(screen.getByText("Alpha")).toBeVisible();
        expect(screen.getByText("Bravo")).toBeVisible();
    });

    it("asks for the variant's plays without a mods parameter", async () => {
        const requests = recordRequests();

        renderWithProviders(<TopPlaysTab variant={readingVariant} />);

        await screen.findByText("Alpha Song");

        expect(requests).toHaveLength(1);
        expect(requests[0].searchParams.get("type")).toBe("reading");
        expect(requests[0].searchParams.has("mods")).toBe(false);
    });

    it("asks for the plays with the mods picked in the mod filter", async () => {
        const requests = recordRequests();

        renderWithProviders(<TopPlaysTab variant={droidRebalance} />);

        await screen.findByText("Alpha Song");
        await userEvent.click(screen.getByRole("button", { name: "Select mods" }));
        await userEvent.click(screen.getByRole("checkbox", { name: /hidden/i }));
        await userEvent.click(screen.getByRole("checkbox", { name: /double time/i }));

        await waitFor(() => expect(requests).toHaveLength(3));

        expect(requests.map((url) => url.searchParams.get("mods"))).toEqual([null, "HD", "HDDT"]);
    });

    it("shows loading instead of the previous mod set's plays while new ones load", async () => {
        const bravoOnly = topPlays.filter((play) => play.username === "Bravo");
        let release: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });

        server.use(
            http.get("/api/ppboard/prototype/gettopplays", async ({ request }) => {
                const hasMods = new URL(request.url).searchParams.has("mods");

                if (hasMods) {
                    await gate;
                }

                return HttpResponse.json({
                    variants: [droidRebalance, readingVariant],
                    currentVariant: droidRebalance,
                    data: hasMods ? bravoOnly : topPlays,
                });
            }),
        );

        renderWithProviders(<TopPlaysTab variant={droidRebalance} />);

        await screen.findByText("Alpha Song");
        await userEvent.click(screen.getByRole("button", { name: "Select mods" }));
        await userEvent.click(screen.getByRole("checkbox", { name: /hidden/i }));

        // The picker stays; the rows of the other mod set do not.
        expect(screen.getByRole("button", { name: /select mods/i })).toBeVisible();
        expect(screen.getByText("Loading...")).toBeVisible();
        expect(screen.queryByText("Alpha Song")).not.toBeInTheDocument();
        expect(screen.queryByRole("row")).not.toBeInTheDocument();

        release();

        expect(await screen.findAllByRole("row")).not.toHaveLength(0);
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    it("keeps the picked mods when the plays fail to load and are retried", async () => {
        let isFailing = false;

        server.use(
            http.get("/api/ppboard/prototype/gettopplays", ({ request }) => {
                if (isFailing && new URL(request.url).searchParams.has("mods")) {
                    return HttpResponse.json({ message: "Too many requests" }, { status: 429 });
                }

                const hasMods = new URL(request.url).searchParams.has("mods");

                return HttpResponse.json({
                    variants: [droidRebalance, readingVariant],
                    currentVariant: droidRebalance,
                    data: hasMods
                        ? topPlays.map((play) => ({ ...play, mods: [{ acronym: "HD" }] }))
                        : topPlays,
                });
            }),
        );

        renderWithProviders(<TopPlaysTab variant={droidRebalance} />);

        await screen.findByText("Alpha Song");

        isFailing = true;
        await userEvent.click(screen.getByRole("button", { name: "Select mods" }));
        await userEvent.click(screen.getByRole("checkbox", { name: /hidden/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests");

        isFailing = false;
        await userEvent.click(screen.getByRole("button", { name: "Try again" }));

        expect(await screen.findByText("Alpha Song")).toBeVisible();
        expect(screen.getByRole("button", { name: /select mods.*HD/i })).toBeVisible();
    });

    it("remembers its columns as top-plays-columns", async () => {
        renderWithProviders(<TopPlaysTab variant={droidRebalance} />);

        await screen.findByText("Alpha Song");

        await userEvent.click(screen.getByRole("button", { name: "Columns" }));
        await userEvent.click(screen.getByRole("checkbox", { name: "Miss" }));

        expect(localStorage.getItem("top-plays-columns")).not.toBeNull();
    });

    it("shows an error with a retry when the plays cannot be loaded", async () => {
        server.use(
            http.get("/api/ppboard/prototype/gettopplays", () =>
                HttpResponse.json({ message: "Too many requests" }, { status: 429 }),
            ),
        );

        renderWithProviders(<TopPlaysTab variant={droidRebalance} />);

        expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests");
    });
});

describe("useTopPlays", () => {
    it("sends the picked mods as joined acronyms", async () => {
        const requests = recordRequests();

        const { result } = renderHook(() => useTopPlays("droid-rebalance", ["HD", "DT"]), {
            wrapper,
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(requests[0].searchParams.get("mods")).toBe("HDDT");
        expect(requests[0].searchParams.get("type")).toBe("droid-rebalance");
    });

    it("asks again when the mods change", async () => {
        const requests = recordRequests();

        const { result, rerender } = renderHook(
            ({ mods }) => useTopPlays("droid-rebalance", mods),
            { wrapper, initialProps: { mods: ["HD"] } },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        rerender({ mods: ["HD", "DT"] });
        await waitFor(() => expect(requests).toHaveLength(2));

        expect(requests.map((url) => url.searchParams.get("mods"))).toEqual(["HD", "HDDT"]);
    });
});
