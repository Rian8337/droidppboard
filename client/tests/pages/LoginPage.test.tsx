import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { LoginPage } from "../../src/pages/LoginPage";
import { plainMe } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

/** Stands in for Cloudflare's script: solves the challenge as soon as the widget is rendered. */
function installTurnstile() {
    const reset = vi.fn();

    window.turnstile = {
        render: (_container, options) => {
            options.callback("captcha-token");

            return "widget";
        },
        reset,
        remove: vi.fn(),
    };

    return reset;
}

function renderLogin(route: string | { pathname: string; state?: unknown } = "/login") {
    return renderWithProviders(
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<p>Home page</p>} />
            <Route path="/v/reading/queue" element={<p>Queue page</p>} />
        </Routes>,
        { route, me: null },
    );
}

async function submitCredentials() {
    await userEvent.type(screen.getByLabelText("Username"), "player");
    await userEvent.type(screen.getByLabelText("Password"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
}

describe("LoginPage", () => {
    beforeEach(() => {
        vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        delete window.turnstile;
    });

    it("sends the credentials with the captcha token and returns to the page the person came from", async () => {
        installTurnstile();

        const bodies: unknown[] = [];

        server.use(
            http.post("/api/auth/login", async ({ request }) => {
                bodies.push(await request.json());

                return HttpResponse.json({ uid: plainMe.uid, username: plainMe.username });
            }),
        );
        renderLogin({ pathname: "/login", state: { from: "/v/reading/queue" } });

        await submitCredentials();

        expect(await screen.findByText("Queue page")).toBeVisible();
        expect(bodies).toEqual([
            { username: "player", password: "secret", turnstileToken: "captcha-token" },
        ]);
    });

    it("goes to the root when there is no page to return to", async () => {
        installTurnstile();
        renderLogin();

        await submitCredentials();

        expect(await screen.findByText("Home page")).toBeVisible();
    });

    it("does not return to the login page itself", async () => {
        installTurnstile();
        renderLogin({ pathname: "/login", state: { from: "/login" } });

        await submitCredentials();

        expect(await screen.findByText("Home page")).toBeVisible();
    });

    it("shows the server's message for a wrong password and asks for a new captcha", async () => {
        const reset = installTurnstile();

        server.use(
            http.post("/api/auth/login", () =>
                HttpResponse.json({ message: "Invalid username or password" }, { status: 401 }),
            ),
        );
        renderLogin();

        await submitCredentials();

        expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password");
        expect(reset).toHaveBeenCalled();
        expect(screen.getByLabelText("Password")).toHaveValue("");
    });

    it("shows how long to wait when the login is throttled", async () => {
        installTurnstile();

        server.use(
            http.post("/api/auth/login", () =>
                HttpResponse.json(
                    { message: "Too many login attempts. Please try again later." },
                    { status: 429, headers: { "Retry-After": "42" } },
                ),
            ),
        );
        renderLogin();

        await submitCredentials();

        const alert = await screen.findByRole("alert");

        expect(alert).toHaveTextContent("Too many login attempts");
        expect(alert).toHaveTextContent("Try again in 42 seconds");
    });

    it("leaves the button off until the captcha is solved", async () => {
        window.turnstile = { render: () => "widget", reset: vi.fn(), remove: vi.fn() };
        renderLogin();

        await userEvent.type(screen.getByLabelText("Username"), "player");
        await userEvent.type(screen.getByLabelText("Password"), "secret");

        expect(screen.getByRole("button", { name: "Log in" })).toBeDisabled();
    });

    it("says so when no site key is configured", () => {
        vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
        renderLogin();

        expect(screen.getByText("Login is not configured.")).toBeVisible();
        expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
    });

    it("sends somebody who is logged in already on their way", async () => {
        installTurnstile();
        renderWithProviders(
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<p>Home page</p>} />
            </Routes>,
            { route: "/login", me: plainMe },
        );

        await waitFor(() => expect(screen.getByText("Home page")).toBeVisible());
    });
});
