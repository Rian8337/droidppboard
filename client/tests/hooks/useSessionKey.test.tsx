import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLogin, useLogout } from "../../src/api/auth";
import { useSessionKey } from "../../src/hooks/useSessionKey";
import { mockSession } from "../utils/mockSession";
import { renderWithProviders } from "../utils/renderWithProviders";

function Probe() {
    const key = useSessionKey();
    const logout = useLogout();
    const login = useLogin();

    return (
        <>
            <p>{`key ${key}`}</p>
            <button onClick={() => logout.mutate()}>Log out</button>
            <button
                onClick={() =>
                    login.mutate({ username: "player", password: "x", turnstileToken: "t" })
                }
            >
                Log in
            </button>
        </>
    );
}

describe("useSessionKey", () => {
    it("stays the same when who is logged in is found out for the first time", async () => {
        mockSession();

        renderWithProviders(<Probe />);

        expect(screen.getByText("key 0")).toBeVisible();
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(screen.getByText("key 0")).toBeVisible();
    });

    it("changes after a logout and after a login", async () => {
        mockSession();

        renderWithProviders(<Probe />);
        await new Promise((resolve) => setTimeout(resolve, 50));

        await userEvent.click(screen.getByRole("button", { name: "Log out" }));
        expect(await screen.findByText("key 1")).toBeVisible();

        await userEvent.click(screen.getByRole("button", { name: "Log in" }));
        expect(await screen.findByText("key 2")).toBeVisible();
    });
});
