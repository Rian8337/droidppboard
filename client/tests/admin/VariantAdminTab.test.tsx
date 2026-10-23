import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { VariantAdminTab } from "../../src/admin/VariantAdminTab";
import {
    adminMe,
    ownerMe,
    buildAdminKey,
    buildAdminUser,
    buildAdminVariant,
    buildFullRun,
    droidRebalance,
    flowaim,
    managerMe,
} from "../mocks/fixtures";
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
        await userEvent.click(
            within(await screen.findByRole("dialog")).getByRole("button", { name: "Remove" }),
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

    it("does not offer to change the visibility or pin in the settings", async () => {
        renderTab();

        await userEvent.click(await screen.findByRole("button", { name: "Edit settings" }));

        expect(await screen.findByRole("textbox", { name: "Title" })).toBeVisible();
        expect(screen.queryByRole("checkbox", { name: /Public/ })).not.toBeInTheDocument();
        expect(screen.queryByRole("checkbox", { name: /Pinned/ })).not.toBeInTheDocument();
    });

    it("closes the settings without asking when nothing changed", async () => {
        renderTab();

        await userEvent.click(await screen.findByRole("button", { name: "Edit settings" }));
        await userEvent.click(
            within(await screen.findByRole("dialog", { name: "Edit settings" })).getByRole(
                "button",
                { name: "Cancel" },
            ),
        );

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("asks before discarding changed settings, and keeps them when told to", async () => {
        renderTab();

        await userEvent.click(await screen.findByRole("button", { name: "Edit settings" }));
        await userEvent.type(await screen.findByRole("textbox", { name: "Title" }), " v2");
        await userEvent.click(
            within(screen.getByRole("dialog", { name: "Edit settings" })).getByRole("button", {
                name: "Cancel",
            }),
        );
        await userEvent.click(
            within(await screen.findByRole("dialog", { name: "Discard your changes?" })).getByRole(
                "button",
                { name: "Keep editing" },
            ),
        );

        expect(
            screen.queryByRole("dialog", { name: "Discard your changes?" }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Flow aim v2");
    });

    it("closes the settings once discarding is confirmed", async () => {
        renderTab();

        await userEvent.click(await screen.findByRole("button", { name: "Edit settings" }));
        await userEvent.type(await screen.findByRole("textbox", { name: "Title" }), " v2");
        await userEvent.click(
            within(screen.getByRole("dialog", { name: "Edit settings" })).getByRole("button", {
                name: "Close",
            }),
        );
        await userEvent.click(
            within(await screen.findByRole("dialog", { name: "Discard your changes?" })).getByRole(
                "button",
                { name: "Discard" },
            ),
        );

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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

describe("moving an alias", () => {
    const adminVariants = [
        buildAdminVariant({ name: "flowaim", public: false }),
        buildAdminVariant({ name: "reading", aliases: ["mine"] }),
        buildAdminVariant({ name: "droid-live", aliases: ["live"] }),
        buildAdminVariant({ name: "osu-live", aliases: ["osu"] }),
    ];

    async function typeAlias(alias: string, me: typeof managerMe) {
        renderTab(me);
        await userEvent.click(await screen.findByRole("button", { name: "Edit settings" }));
        await userEvent.type(await screen.findByRole("textbox", { name: "New alias" }), alias);
    }

    it.each(["live", "osu"])(
        "asks an admin before taking %s from droid-live or osu-live, then moves it",
        async (alias) => {
            const sent = serveManage({ grants, usernames, roles, adminVariants });

            await typeAlias(alias, adminMe);
            await userEvent.click(await screen.findByRole("button", { name: "Add alias" }));

            expect(await screen.findByText(new RegExp(`${alias} points to`))).toBeVisible();
            expect(
                sent.filter((request) => request.path.startsWith("/api/manage/aliases")),
            ).toEqual([]);

            await userEvent.click(screen.getByRole("button", { name: "Move alias here" }));

            await waitFor(() =>
                expect(sent).toContainEqual({
                    method: "PUT",
                    path: `/api/manage/aliases/${alias}`,
                    body: { variant: "flowaim" },
                }),
            );
        },
    );

    it("offers a manager to move an alias of a variant they manage", async () => {
        serveManage({ grants, usernames, roles, adminVariants });

        await typeAlias("mine", { ...managerMe, grants: ["flowaim", "reading"] });
        await userEvent.click(await screen.findByRole("button", { name: "Add alias" }));

        expect(await screen.findByRole("button", { name: "Move alias here" })).toBeEnabled();
        expect(screen.getByText(/mine points to reading now/)).toBeVisible();
    });

    it("reads the broker's refusal when a manager takes an alias of a variant they do not manage", async () => {
        // The manager's list holds only their own variants, so the owner cannot be seen.
        serveManage({ grants, usernames, roles, adminVariants: [adminVariants[0]] });
        server.use(
            http.put("/api/manage/aliases/:alias", () =>
                HttpResponse.json(
                    { error: { code: "forbidden", message: "Forbidden" } },
                    { status: 403 },
                ),
            ),
        );

        await typeAlias("live", managerMe);
        await userEvent.click(await screen.findByRole("button", { name: "Add alias" }));

        expect(
            await screen.findByText("That alias belongs to a rework you don't manage."),
        ).toBeVisible();
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

        renderTab(ownerMe);

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
        await userEvent.click(
            within(await screen.findByRole("dialog")).getByRole("button", { name: "Remove" }),
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

    it("lists the admins, who can use every variant without a grant", async () => {
        serveManage({
            grants,
            usernames: { ...usernames, 9: "Boss" },
            roles: { ...roles, 9: "admin" },
            keys,
            users: [
                buildAdminUser({ uid: 9, role: "admin" }),
                buildAdminUser({ uid: 6, role: "admin" }),
            ],
        });

        renderTab(adminMe);

        const boss = (await screen.findByText("Boss")).closest("tr")!;

        expect(within(boss).getByText("Admin")).toBeVisible();
        expect(within(boss).getByText("Every rework")).toBeVisible();
        expect(within(boss).queryByRole("button")).not.toBeInTheDocument();

        // An admin who also has a grant is listed once, with the grant to remove.
        const rootie = screen.getByText("Rootie").closest("tr")!;

        expect(within(rootie).getByText("Granted")).toBeVisible();
        expect(screen.getAllByText("Rootie")).toHaveLength(1);
    });

    it("sends nothing when removing access is cancelled", async () => {
        const sent = serveManage({ grants, usernames, roles, keys });

        renderTab(adminMe);
        await userEvent.click(
            await screen.findByRole("button", { name: "Remove access for Newbie" }),
        );
        await userEvent.click(
            within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }),
        );

        expect(sent.filter((request) => request.method === "DELETE")).toHaveLength(0);
    });

    it("shows an admin neither the keys nor a way to grant one, as only owners manage keys", async () => {
        serveManage({ grants, usernames, roles, keys });

        renderTab(adminMe);

        expect(await screen.findByText("Newbie")).toBeVisible();
        expect(screen.queryByText("granted-bot")).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Grant access to key" }),
        ).not.toBeInTheDocument();
    });

    it("lists the owners with the admins, who can use every variant without a grant", async () => {
        serveManage({
            grants,
            usernames: { ...usernames, 10: "Founder" },
            roles: { ...roles, 10: "owner" },
            keys,
            users: [buildAdminUser({ uid: 10, role: "owner" })],
        });

        renderTab(ownerMe);

        const founder = (await screen.findByText("Founder")).closest("tr")!;

        expect(within(founder).getByText("Owner")).toBeVisible();
        expect(within(founder).getByText("Every rework")).toBeVisible();
        expect(within(founder).queryByRole("button")).not.toBeInTheDocument();
    });

    it("grants a key that does not have the variant yet", async () => {
        const sent = serveManage({ grants, usernames, roles, keys });

        renderTab(ownerMe);
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
        await userEvent.click(screen.getByRole("checkbox", { name: /Pinned/ }));
        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "PATCH",
                path: "/api/manage/variants/flowaim",
                body: { title: "Flow", public: true, pinned: true },
            }),
        );
    });

    it("does not offer to pin droid-rebalance, which always leads the sidebar", async () => {
        serveManage({ grants, usernames, roles, keys });

        renderWithProviders(<VariantAdminTab variant={droidRebalance} />, {
            route: "/v/droid-rebalance/admin",
            me: adminMe,
        });
        await userEvent.click(await screen.findByRole("button", { name: "Edit settings" }));

        expect(await screen.findByRole("checkbox", { name: /Public/ })).toBeVisible();
        expect(screen.queryByRole("checkbox", { name: /Pinned/ })).not.toBeInTheDocument();
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
                "Recalculates every player in this rework, first adding any droid-rebalance player it is missing. Players that were recalculated in a past run are skipped.",
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
