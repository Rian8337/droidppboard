import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { useLogin, useLogout, useMe } from "../../src/api/auth";
import { useVariants } from "../../src/api/variants";
import { droidRebalance, flowaim, managerMe, plainMe } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

type Person = "manager" | "player" | null;

interface MockedSession {
    /** When the server last changed who is logged in, which is when its answer was sent. */
    getChangedAt: () => number | null;
}

/**
 * Makes the mocked server answer for one person at a time, and lets login and logout switch them
 * with a realistic latency. Once the person has changed its answers get slow, so that anything
 * left over from before would still be on screen when the new answers arrive.
 */
function mockSession(initial: Person = "manager"): MockedSession {
    let person = initial;
    let changedAt: number | null = null;

    function changePerson(next: Person): void {
        person = next;
        changedAt = Date.now();
    }

    server.use(
        http.get("/api/auth/me", async () => {
            await delay(changedAt === null ? 0 : 300);

            return person === null
                ? HttpResponse.json({ message: "Not logged in" }, { status: 401 })
                : HttpResponse.json(person === "manager" ? managerMe : plainMe);
        }),
        http.get("/api/ppboard/variants", async () => {
            await delay(changedAt === null ? 0 : 150);

            return HttpResponse.json(
                person === "manager" ? [droidRebalance, flowaim] : [droidRebalance],
            );
        }),
        http.post("/api/auth/logout", async () => {
            await delay(80);
            changePerson(null);

            return new HttpResponse(null, { status: 204 });
        }),
        http.post("/api/auth/login", async () => {
            await delay(80);
            changePerson("player");

            return HttpResponse.json({ uid: plainMe.uid, username: plainMe.username });
        }),
    );

    return { getChangedAt: () => changedAt };
}

/**
 * Counts how often `text` is on screen from a moment after the server changed who is logged in
 * (the grace is for the response to arrive) until `sampleCount` samples have been taken.
 *
 * @returns A function that waits for the samples and gives the number of sightings.
 */
function watchFor(text: string, { getChangedAt }: MockedSession, sampleCount = 40) {
    let sightings = 0;
    let samples = 0;
    const interval = setInterval(() => {
        const changedAt = getChangedAt();

        if (changedAt === null || Date.now() - changedAt < 30) {
            return;
        }

        samples++;

        if (screen.queryByText(text)) {
            sightings++;
        }
    }, 5);

    return async () => {
        try {
            await waitFor(() => expect(samples).toBeGreaterThan(sampleCount));
        } finally {
            clearInterval(interval);
        }

        return sightings;
    };
}

function VariantList() {
    const variants = useVariants();

    return (
        <ul>
            {variants.data?.map((variant) => (
                <li key={variant.name}>{variant.name}</li>
            ))}
        </ul>
    );
}

describe("useMe", () => {
    it("returns the person who is logged in", async () => {
        mockSession();

        function Probe() {
            const me = useMe();

            return <p>{me.data ? `${me.data.username}:${me.data.role}` : "pending"}</p>;
        }

        renderWithProviders(<Probe />);

        expect(await screen.findByText("manager:manager")).toBeInTheDocument();
    });

    it("returns null on a 401", async () => {
        mockSession(null);

        function Probe() {
            const me = useMe();

            return <p>{me.isSuccess ? (me.data === null ? "nobody" : "somebody") : "pending"}</p>;
        }

        renderWithProviders(<Probe />);

        expect(await screen.findByText("nobody")).toBeInTheDocument();
    });
});

describe("useLogin", () => {
    it("posts the credentials and loads the person who logged in", async () => {
        let body: unknown;
        let isLoggedIn = false;

        server.use(
            http.post("/api/auth/login", async ({ request }) => {
                body = await request.json();
                isLoggedIn = true;

                return HttpResponse.json({ uid: managerMe.uid, username: managerMe.username });
            }),
            http.get("/api/auth/me", () =>
                isLoggedIn
                    ? HttpResponse.json(managerMe)
                    : HttpResponse.json({ message: "Not logged in" }, { status: 401 }),
            ),
        );

        function Probe() {
            const me = useMe();
            const login = useLogin();

            return (
                <>
                    <p>{me.isSuccess ? (me.data?.username ?? "nobody") : "pending"}</p>
                    <button
                        onClick={() =>
                            login.mutate({
                                username: "manager",
                                password: "hunter2",
                                turnstileToken: "token",
                            })
                        }
                    >
                        Log in
                    </button>
                </>
            );
        }

        renderWithProviders(<Probe />);
        expect(await screen.findByText("nobody")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Log in" }));

        expect(await screen.findByText("manager")).toBeInTheDocument();
        expect(body).toEqual({ username: "manager", password: "hunter2", turnstileToken: "token" });
    });

    it("drops data cached as the previous person on login", async () => {
        const session = mockSession();

        function Probe() {
            const login = useLogin();

            return (
                <>
                    <VariantList />
                    <button
                        onClick={() =>
                            login.mutate({
                                username: "player",
                                password: "hunter2",
                                turnstileToken: "token",
                            })
                        }
                    >
                        Log in
                    </button>
                </>
            );
        }

        renderWithProviders(<Probe />);
        expect(await screen.findByText("flowaim")).toBeInTheDocument();

        const finishWatching = watchFor("flowaim", session);
        await userEvent.click(screen.getByRole("button", { name: "Log in" }));

        expect(await finishWatching()).toBe(0);
        expect(screen.getByText("droid-rebalance")).toBeInTheDocument();
    });
});

describe("useLogout", () => {
    // Review focus 4: logging out on a private variant's page must not leave its data on screen.
    it("drops private data on logout", async () => {
        const session = mockSession();

        function Probe() {
            const logout = useLogout();

            return (
                <>
                    <VariantList />
                    <button onClick={() => logout.mutate()}>Log out</button>
                </>
            );
        }

        renderWithProviders(<Probe />);
        expect(await screen.findByText("flowaim")).toBeInTheDocument();

        const finishWatching = watchFor("flowaim", session);
        await userEvent.click(screen.getByRole("button", { name: "Log out" }));

        expect(await finishWatching()).toBe(0);
        expect(screen.getByText("droid-rebalance")).toBeInTheDocument();
    });

    it("loads who is logged in again", async () => {
        mockSession();

        function Probe() {
            const me = useMe();
            const logout = useLogout();

            return (
                <>
                    <p>{me.isSuccess ? (me.data?.username ?? "nobody") : "pending"}</p>
                    <button onClick={() => logout.mutate()}>Log out</button>
                </>
            );
        }

        renderWithProviders(<Probe />);
        expect(await screen.findByText("manager")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Log out" }));

        expect(await screen.findByText("nobody")).toBeInTheDocument();
    });

    it("still succeeds when loading who is logged in again fails", async () => {
        mockSession();

        function Probe() {
            const logout = useLogout();

            return (
                <>
                    <p>{logout.status}</p>
                    <button onClick={() => logout.mutate()}>Log out</button>
                </>
            );
        }

        renderWithProviders(<Probe />);
        server.use(
            http.get("/api/auth/me", () =>
                HttpResponse.json({ message: "Broken" }, { status: 500 }),
            ),
        );

        await userEvent.click(screen.getByRole("button", { name: "Log out" }));

        expect(await screen.findByText("success")).toBeInTheDocument();
    });
});
