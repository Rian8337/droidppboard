import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { useLogin, useLogout, useMe } from "../../src/api/auth";
import { useVariants } from "../../src/api/variants";
import { droidRebalance, flowaim, managerMe } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

/** Switches the mocked server between a logged in manager and a logged out visitor. */
function mockSession(): { logOut: () => void; getLoggedOutAt: () => number | null } {
    let isLoggedIn = true;
    let loggedOutAt: number | null = null;

    server.use(
        http.get("/api/auth/me", async () => {
            await delay(isLoggedIn ? 0 : 300);

            return isLoggedIn
                ? HttpResponse.json(managerMe)
                : HttpResponse.json({ message: "Not logged in" }, { status: 401 });
        }),
        http.get("/api/ppboard/variants", async () => {
            // Slow enough that anything stale would still be on screen when the answer arrives.
            await delay(isLoggedIn ? 0 : 150);

            return HttpResponse.json(isLoggedIn ? [droidRebalance, flowaim] : [droidRebalance]);
        }),
        http.post("/api/auth/logout", () => {
            isLoggedIn = false;
            loggedOutAt = Date.now();

            return new HttpResponse(null, { status: 204 });
        }),
    );

    return {
        logOut: () => {
            isLoggedIn = false;
        },
        getLoggedOutAt: () => loggedOutAt,
    };
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
        mockSession().logOut();

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
});

describe("useLogout", () => {
    // Review focus 4: logging out on a private variant's page must not leave its data on screen.
    it("drops private data on logout", async () => {
        const { getLoggedOutAt } = mockSession();

        function Probe() {
            const variants = useVariants();
            const logout = useLogout();

            return (
                <>
                    <ul>
                        {variants.data?.map((variant) => (
                            <li key={variant.name}>{variant.name}</li>
                        ))}
                    </ul>
                    <button onClick={() => logout.mutate()}>Log out</button>
                </>
            );
        }

        renderWithProviders(<Probe />);
        expect(await screen.findByText("flowaim")).toBeInTheDocument();

        // Once the server has logged the person out (with a moment's grace for the response to
        // arrive), note whenever the private variant is on screen. The slow answers above keep any
        // stale copy there long enough to be seen.
        let sightings = 0;
        let samples = 0;
        const interval = setInterval(() => {
            const loggedOutAt = getLoggedOutAt();

            if (loggedOutAt === null || Date.now() - loggedOutAt < 30) {
                return;
            }

            samples++;

            if (screen.queryByText("flowaim")) {
                sightings++;
            }
        }, 5);

        await userEvent.click(screen.getByRole("button", { name: "Log out" }));
        await waitFor(() => expect(samples).toBeGreaterThan(40));
        clearInterval(interval);

        expect(sightings).toBe(0);
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
});
