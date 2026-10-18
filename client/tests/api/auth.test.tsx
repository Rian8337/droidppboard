import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useLogin, useLogout, useMe } from "../../src/api/auth";
import { useVariants } from "../../src/api/variants";
import { managerMe } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { mockSession, watchFor } from "../utils/mockSession";
import { renderWithProviders } from "../utils/renderWithProviders";

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
