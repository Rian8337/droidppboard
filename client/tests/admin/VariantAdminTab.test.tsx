import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { VariantAdminTab } from "../../src/admin/VariantAdminTab";
import { adminMe, buildAdminKey, buildFullRun, flowaim, managerMe } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";
import { serveManage } from "./serveManage";

const usernames = { 2: "manager", 5: "Otherman", 6: "Rootie", 7: "Newbie" };
const roles = { 2: "manager", 5: "manager", 6: "admin" } as const;
const grants = [2, 5, 6, 7];

function renderTab(me = managerMe) {
    return renderWithProviders(<VariantAdminTab variant={flowaim} />, {
        route: "/v/flowaim/admin",
        me,
    });
}

describe("VariantAdminTab as a manager", () => {
    beforeEach(() => {
        serveManage({ grants, usernames, roles });
    });

    it("lists the people granted the variant with their uid, username and role", async () => {
        renderTab();

        const row = (await screen.findByText("Newbie")).closest("tr");

        expect(row).not.toBeNull();
        expect(within(row!).getByText("7")).toBeVisible();
        expect(within(row!).getByText("No role")).toBeVisible();

        const adminRow = screen.getByText("Rootie").closest("tr")!;

        expect(within(adminRow).getByText("Admin")).toBeVisible();
    });

    it("offers Remove only for a person without a role", async () => {
        renderTab();

        await screen.findByText("Newbie");
        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Remove access for Newbie" })).toBeVisible(),
        );

        expect(
            screen.queryByRole("button", { name: /Remove access for Otherman/ }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /Remove access for Rootie/ }),
        ).not.toBeInTheDocument();
        // A manager can never remove their own access.
        expect(
            screen.queryByRole("button", { name: /Remove access for manager/ }),
        ).not.toBeInTheDocument();
    });

    it("removes the access of a person without a role", async () => {
        const sent = serveManage({ grants, usernames, roles });

        renderTab();
        await userEvent.click(
            await screen.findByRole("button", { name: "Remove access for Newbie" }),
        );

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "DELETE",
                path: "/api/manage/variants/flowaim/grants/7",
                body: undefined,
            }),
        );
    });

    it("has no key section, no key button and no full-run controls", async () => {
        renderTab();

        await screen.findByText("Newbie");

        expect(
            screen.queryByRole("button", { name: "Grant access to key" }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("API keys")).not.toBeInTheDocument();
        expect(screen.queryByText("Recalculate all players")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Edit settings" })).toBeVisible();
        expect(screen.getByRole("button", { name: "Grant access to user" })).toBeVisible();
    });

    it("does not offer to change the visibility in the settings", async () => {
        renderTab();

        await userEvent.click(await screen.findByRole("button", { name: "Edit settings" }));

        expect(await screen.findByRole("textbox", { name: "Title" })).toBeVisible();
        expect(screen.queryByRole("checkbox", { name: /Public/ })).not.toBeInTheDocument();
    });

    it("refuses to grant a manager or an admin, and says why without asking the broker to", async () => {
        const sent = serveManage({ grants, usernames, roles: { ...roles, 9: "manager" } });

        renderTab();
        await userEvent.click(await screen.findByRole("button", { name: "Grant access to user" }));
        await userEvent.type(await screen.findByRole("textbox", { name: "User ID" }), "9");
        await userEvent.click(screen.getByRole("button", { name: "Grant access" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Managers can only give access to people who have no role.",
        );
        expect(sent).toEqual([]);
    });

    it("grants a person without a role", async () => {
        const sent = serveManage({ grants, usernames, roles });

        renderTab();
        await userEvent.click(await screen.findByRole("button", { name: "Grant access to user" }));
        await userEvent.type(await screen.findByRole("textbox", { name: "User ID" }), "9");
        await userEvent.click(screen.getByRole("button", { name: "Grant access" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "PUT",
                path: "/api/manage/variants/flowaim/grants/9",
                body: undefined,
            }),
        );
        await waitFor(() =>
            expect(screen.queryByRole("textbox", { name: "User ID" })).not.toBeInTheDocument(),
        );
    });
});

describe("VariantAdminTab as an admin", () => {
    const keys = [
        buildAdminKey({ name: "granted-bot", grants: ["flowaim"] }),
        buildAdminKey({ name: "everything-bot", allVariants: true }),
        buildAdminKey({ name: "other-bot", grants: ["reading"] }),
        buildAdminKey({
            name: "dead-bot",
            grants: ["flowaim"],
            revokedAt: "2026-09-10T10:00:00.000Z",
        }),
        buildAdminKey({ name: "free-bot" }),
    ];

    it("shows keys granted the variant with Remove, and keys for every variant as inherited", async () => {
        const sent = serveManage({ grants, usernames, roles, keys });

        renderTab(adminMe);

        const granted = (await screen.findByText("granted-bot")).closest("tr")!;
        const inherited = screen.getByText("everything-bot").closest("tr")!;

        expect(within(granted).getByText("Granted")).toBeVisible();
        expect(within(inherited).getByText("Inherited")).toBeVisible();
        expect(within(inherited).queryByRole("button")).not.toBeInTheDocument();
        expect(screen.queryByText("other-bot")).not.toBeInTheDocument();
        expect(screen.queryByText("dead-bot")).not.toBeInTheDocument();

        await userEvent.click(
            within(granted).getByRole("button", { name: "Remove access for granted-bot" }),
        );

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "DELETE",
                path: "/api/manage/keys/granted-bot/grants/flowaim",
                body: undefined,
            }),
        );
    });

    it("lets an admin remove anyone", async () => {
        serveManage({ grants, usernames, roles, keys });

        renderTab(adminMe);

        for (const name of ["manager", "Otherman", "Rootie", "Newbie"]) {
            expect(
                await screen.findByRole("button", { name: `Remove access for ${name}` }),
            ).toBeVisible();
        }
    });

    it("grants a key that does not have the variant yet", async () => {
        const sent = serveManage({ grants, usernames, roles, keys });

        renderTab(adminMe);
        await userEvent.click(await screen.findByRole("button", { name: "Grant access to key" }));

        const select = await screen.findByRole("combobox", { name: "Key" });
        const options = within(select)
            .getAllByRole("option")
            .map((option) => option.textContent);

        expect(options).toEqual(["Choose a key", "other-bot", "free-bot"]);

        await userEvent.selectOptions(select, "free-bot");
        await userEvent.click(screen.getByRole("button", { name: "Grant access" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "PUT",
                path: "/api/manage/keys/free-bot/grants/flowaim",
                body: undefined,
            }),
        );
    });

    it("saves only what changed in the settings", async () => {
        const sent = serveManage({ grants, usernames, roles, keys });

        renderTab(adminMe);
        await userEvent.click(await screen.findByRole("button", { name: "Edit settings" }));

        const title = await screen.findByRole("textbox", { name: "Title" });

        await userEvent.clear(title);
        await userEvent.type(title, "Flow");
        await userEvent.click(screen.getByRole("checkbox", { name: /Public/ }));
        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "PATCH",
                path: "/api/manage/variants/flowaim",
                body: { title: "Flow", public: true },
            }),
        );
    });

    it("stops the title counter at 100", async () => {
        serveManage({ grants, usernames, roles, keys });

        renderTab(adminMe);
        await userEvent.click(await screen.findByRole("button", { name: "Edit settings" }));

        const title = await screen.findByRole("textbox", { name: "Title" });

        await userEvent.clear(title);
        await userEvent.type(title, "a".repeat(120));

        expect(screen.getByText("100 / 100")).toBeVisible();
        expect(title).toHaveValue("a".repeat(100));
    });

    it("adds and removes aliases at once", async () => {
        const sent = serveManage({ grants, usernames, roles, keys });

        renderTab(adminMe);
        await userEvent.click(await screen.findByRole("button", { name: "Edit settings" }));
        await userEvent.type(await screen.findByRole("textbox", { name: "New alias" }), "flow");
        await userEvent.click(screen.getByRole("button", { name: "Add alias" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "PUT",
                path: "/api/manage/aliases/flow",
                body: { variant: "flowaim" },
            }),
        );
    });
});

describe("full-run controls", () => {
    it("starts without asking, and asks before restarting from the beginning", async () => {
        const sent = serveManage({ grants, usernames, roles });

        renderTab(adminMe);

        expect(await screen.findByText("Recalculate all players")).toBeVisible();
        expect(
            screen.getByText(
                "Recalculates every player in this variant, first adding any droid-rebalance player it is missing. If you stop and start again, players already done are skipped.",
            ),
        ).toBeVisible();
        expect(
            screen.getByText(
                "Clears the progress of the previous run, so every player is recalculated again.",
            ),
        ).toBeVisible();

        await userEvent.click(screen.getByRole("button", { name: "Restart from the beginning" }));

        // Nothing is sent until the confirmation.
        const dialog = await screen.findByRole("dialog");

        expect(sent).toEqual([]);

        await userEvent.click(within(dialog).getByRole("button", { name: "Restart" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "POST",
                path: "/api/recalc/full-runs/flowaim/start",
                body: { restart: true },
            }),
        );
    });

    it("does not restart when the confirmation is cancelled", async () => {
        const sent = serveManage({ grants, usernames, roles });

        renderTab(adminMe);
        await userEvent.click(
            await screen.findByRole("button", { name: "Restart from the beginning" }),
        );
        await userEvent.click(
            within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }),
        );

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(sent).toEqual([]);
    });

    it("says Start when no run has made progress, and starts without restarting", async () => {
        const sent = serveManage({ grants, usernames, roles });

        renderTab(adminMe);
        await userEvent.click(await screen.findByRole("button", { name: "Start" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "POST",
                path: "/api/recalc/full-runs/flowaim/start",
                body: { restart: false },
            }),
        );
    });

    it("says Continue when a stopped run made progress", async () => {
        serveManage({
            grants,
            usernames,
            roles,
            fullRuns: [
                buildFullRun({ variant: "flowaim", status: "stopped", done: 40, total: 100 }),
            ],
        });

        renderTab(adminMe);

        expect(await screen.findByRole("button", { name: "Continue" })).toBeEnabled();
        expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
        expect(screen.getByText("40 of 100 players done in the previous run.")).toBeVisible();
    });

    it("keeps Start and Restart disabled while a run is going", async () => {
        serveManage({
            grants,
            usernames,
            roles,
            fullRuns: [buildFullRun({ variant: "flowaim", status: "running" })],
        });

        renderTab(adminMe);

        expect(await screen.findByRole("button", { name: "Start" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Restart from the beginning" })).toBeDisabled();
    });

    it("shows a refusal from the server", async () => {
        serveManage({ grants, usernames, roles });
        server.use(
            http.post("/api/recalc/full-runs/:variant/start", () =>
                HttpResponse.json({ message: "A full run is already going" }, { status: 409 }),
            ),
        );

        renderTab(adminMe);
        await userEvent.click(await screen.findByRole("button", { name: "Start" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("A full run is already going");
    });
});
