import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppRoutes } from "../../src/routing/routes";
import { adminMe, buildAdminKey, buildAdminVariant, managerMe, plainMe } from "../mocks/fixtures";
import { renderWithProviders } from "../utils/renderWithProviders";
import { serveManage } from "./serveManage";

const adminVariants = [
    buildAdminVariant({ name: "droid-live", public: true }),
    buildAdminVariant({ name: "droid-rebalance" }),
    buildAdminVariant({ name: "flowaim", public: false }),
];

const keys = [
    buildAdminKey({ name: "bot", rateLimitPerMinute: 60, grants: ["flowaim", "droid-rebalance"] }),
    buildAdminKey({ name: "site", allVariants: true, canActForUsers: true }),
    buildAdminKey({ name: "old", revokedAt: "2026-09-20T10:00:00.000Z" }),
];

function renderKeys(me = adminMe) {
    return renderWithProviders(<AppRoutes />, { route: "/admin/keys", me });
}

describe("the admin area for people who are not admins", () => {
    it("tells a manager that the admin role is needed", async () => {
        serveManage({ keys });

        renderKeys(managerMe);

        expect(await screen.findByText("You need the admin role to see this page")).toBeVisible();
        expect(screen.queryByRole("button", { name: "Create key" })).not.toBeInTheDocument();
    });

    it("tells a person without a role the same", async () => {
        renderKeys(plainMe);

        expect(await screen.findByText("You need the admin role to see this page")).toBeVisible();
    });
});

describe("KeysPage", () => {
    beforeEach(() => {
        serveManage({ keys, adminVariants });
    });

    it("lists one row per key with its limit, scope, acting, created date and status", async () => {
        renderKeys();

        const bot = (await screen.findByText("bot")).closest("tr")!;

        expect(within(bot).getByText("60 per minute")).toBeVisible();
        expect(within(bot).getByText("2 variants")).toBeVisible();
        expect(within(bot).getByText("No")).toBeVisible();
        expect(within(bot).getByText("Active")).toBeVisible();

        const site = screen.getByText("site").closest("tr")!;

        expect(within(site).getByText("Unlimited")).toBeVisible();
        expect(within(site).getByText("All variants")).toBeVisible();
        expect(within(site).getByText("Yes")).toBeVisible();

        const old = screen.getByText("old").closest("tr")!;

        expect(within(old).getByText("Revoked")).toBeVisible();

        // The header row and one row per key.
        expect(screen.getAllByRole("row")).toHaveLength(4);
    });

    it("shows no edit form until a key is selected", async () => {
        renderKeys();

        await screen.findByText("bot");

        expect(
            screen.queryByRole("textbox", { name: /Requests per minute/ }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Revoke key" })).not.toBeInTheDocument();

        await userEvent.click(screen.getByText("bot"));

        expect(await screen.findByRole("textbox", { name: /Requests per minute/ })).toHaveValue(
            "60",
        );
        expect(screen.getByRole("button", { name: "Revoke key" })).toBeVisible();
    });

    it("filters the list by name", async () => {
        renderKeys();

        await screen.findByText("bot");
        await userEvent.type(screen.getByRole("searchbox", { name: "Search keys" }), "si");

        expect(screen.getByText("site")).toBeVisible();
        expect(screen.queryByText("bot")).not.toBeInTheDocument();
    });

    it("pages at 25 keys", async () => {
        const many = Array.from({ length: 30 }, (_, index) =>
            buildAdminKey({ name: `key-${String(index).padStart(2, "0")}` }),
        );

        serveManage({ keys: many, adminVariants });
        renderKeys();

        await screen.findByText("key-00");

        expect(screen.getAllByRole("row")).toHaveLength(26);
        expect(screen.queryByText("key-25")).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Next page" }));

        expect(await screen.findByText("key-25")).toBeVisible();
        expect(screen.queryByText("key-00")).not.toBeInTheDocument();
    });
});

describe("KeysPage on a phone", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("opens the editor as a page of its own, and Close returns to the list", async () => {
        vi.stubGlobal("matchMedia", (query: string) => ({
            matches: query === "(max-width: 639px)",
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
        }));
        serveManage({ keys, adminVariants });

        renderKeys();
        await userEvent.click(await screen.findByText("bot"));

        expect(await screen.findByRole("button", { name: "Revoke key" })).toBeVisible();
        expect(screen.queryByText("site")).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Close" }));

        expect(await screen.findByText("site")).toBeVisible();
    });
});

describe("editing a key", () => {
    it("saves the rate limit, and clears it when emptied", async () => {
        const sent = serveManage({ keys, adminVariants });

        renderKeys();
        await userEvent.click(await screen.findByText("bot"));

        const limit = await screen.findByRole("textbox", { name: /Requests per minute/ });

        await userEvent.clear(limit);
        await userEvent.type(limit, "120");
        await userEvent.click(screen.getByRole("button", { name: "Save limit" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "PATCH",
                path: "/api/manage/keys/bot",
                body: { rateLimitPerMinute: 120 },
            }),
        );

        await userEvent.clear(limit);
        await userEvent.click(screen.getByRole("button", { name: "Save limit" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "PATCH",
                path: "/api/manage/keys/bot",
                body: { rateLimitPerMinute: null },
            }),
        );
    });

    it("refuses a rate limit that is not a positive whole number", async () => {
        const sent = serveManage({ keys, adminVariants });

        renderKeys();
        await userEvent.click(await screen.findByText("bot"));
        await userEvent.type(
            await screen.findByRole("textbox", { name: /Requests per minute/ }),
            "x",
        );

        expect(screen.getByText("Enter a positive whole number, or leave empty.")).toBeVisible();
        expect(screen.getByRole("button", { name: "Save limit" })).toBeDisabled();
        expect(sent).toHaveLength(0);
    });

    it("changes what the key may do at once", async () => {
        const sent = serveManage({ keys, adminVariants });

        renderKeys();
        await userEvent.click(await screen.findByText("bot"));
        await userEvent.click(
            await screen.findByRole("checkbox", { name: "Can use every variant" }),
        );
        await userEvent.click(screen.getByRole("checkbox", { name: "Can act for users" }));

        await waitFor(() => {
            expect(sent).toContainEqual({
                method: "PATCH",
                path: "/api/manage/keys/bot",
                body: { allVariants: true },
            });
            expect(sent).toContainEqual({
                method: "PATCH",
                path: "/api/manage/keys/bot",
                body: { canActForUsers: true },
            });
        });
    });

    it("grants and removes variants one by one", async () => {
        const sent = serveManage({ keys, adminVariants });

        renderKeys();
        await userEvent.click(await screen.findByText("bot"));
        await userEvent.click(await screen.findByRole("checkbox", { name: "droid-live" }));
        await userEvent.click(screen.getByRole("checkbox", { name: "flowaim" }));

        await waitFor(() => {
            expect(sent).toContainEqual({
                method: "PUT",
                path: "/api/manage/keys/bot/grants/droid-live",
                body: undefined,
            });
            expect(sent).toContainEqual({
                method: "DELETE",
                path: "/api/manage/keys/bot/grants/flowaim",
                body: undefined,
            });
        });
    });

    it("shows a revoked key without anything to change", async () => {
        serveManage({ keys, adminVariants });

        renderKeys();
        await userEvent.click(await screen.findByText("old"));

        expect(await screen.findByText(/Revoked/, { selector: "p" })).toBeVisible();
        expect(screen.queryByRole("button", { name: "Revoke key" })).not.toBeInTheDocument();
        expect(
            screen.queryByRole("textbox", { name: /Requests per minute/ }),
        ).not.toBeInTheDocument();
    });
});

describe("revoking a key", () => {
    it("asks first, and sends nothing when cancelled", async () => {
        const sent = serveManage({ keys, adminVariants });

        renderKeys();
        await userEvent.click(await screen.findByText("bot"));
        await userEvent.click(await screen.findByRole("button", { name: "Revoke key" }));

        const dialog = await screen.findByRole("dialog", { name: "Revoke bot?" });

        expect(sent).toHaveLength(0);

        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

        expect(sent).toHaveLength(0);
    });

    it("revokes once confirmed", async () => {
        const sent = serveManage({ keys, adminVariants });

        renderKeys();
        await userEvent.click(await screen.findByText("bot"));
        await userEvent.click(await screen.findByRole("button", { name: "Revoke key" }));

        const dialog = await screen.findByRole("dialog", { name: "Revoke bot?" });

        await userEvent.click(within(dialog).getByRole("button", { name: "Revoke" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "POST",
                path: "/api/manage/keys/bot/revoke",
                body: undefined,
            }),
        );
    });
});

describe("creating a key", () => {
    const created = {
        key: buildAdminKey({ name: "fresh", rateLimitPerMinute: 30, grants: ["flowaim"] }),
        rawKey: "dpp_raw_secret_value",
    };

    it("sends the form and shows the raw key once", async () => {
        const sent = serveManage({ keys, adminVariants, createdKey: created });

        renderKeys();
        await userEvent.click(await screen.findByRole("button", { name: "Create key" }));
        await userEvent.type(await screen.findByRole("textbox", { name: "Name" }), "fresh");
        await userEvent.type(screen.getByRole("textbox", { name: /Requests per minute/ }), "30");
        await userEvent.click(screen.getByRole("checkbox", { name: "flowaim" }));
        await userEvent.click(screen.getByRole("button", { name: "Create" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "POST",
                path: "/api/manage/keys",
                body: {
                    name: "fresh",
                    rateLimitPerMinute: 30,
                    allVariants: false,
                    canActForUsers: false,
                    grants: ["flowaim"],
                },
            }),
        );

        const dialog = await screen.findByRole("dialog", { name: /fresh/ });

        expect(within(dialog).getByDisplayValue("dpp_raw_secret_value")).toBeVisible();
        expect(within(dialog).getByText("This key will not be shown again")).toBeVisible();
        expect(within(dialog).getByRole("button", { name: "Copy" })).toBeVisible();
    });

    it("forgets the raw key after the dialog is closed", async () => {
        serveManage({ keys, adminVariants, createdKey: created });

        renderKeys();
        await userEvent.click(await screen.findByRole("button", { name: "Create key" }));
        await userEvent.type(await screen.findByRole("textbox", { name: "Name" }), "fresh");
        await userEvent.click(screen.getByRole("button", { name: "Create" }));

        const dialog = await screen.findByRole("dialog", { name: /fresh/ });

        await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));

        await waitFor(() => expect(screen.queryByDisplayValue("dpp_raw_secret_value")).toBeNull());
        expect(document.body).not.toHaveTextContent("dpp_raw_secret_value");
    });

    it("leaves out the variants when the key may use every one", async () => {
        const sent = serveManage({ keys, adminVariants, createdKey: created });

        renderKeys();
        await userEvent.click(await screen.findByRole("button", { name: "Create key" }));
        await userEvent.type(await screen.findByRole("textbox", { name: "Name" }), "fresh");
        await userEvent.click(screen.getByRole("checkbox", { name: "flowaim" }));
        await userEvent.click(screen.getByRole("checkbox", { name: "Can use every variant" }));

        expect(screen.queryByRole("checkbox", { name: "flowaim" })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Create" }));

        await waitFor(() =>
            expect(sent).toContainEqual(
                expect.objectContaining({
                    method: "POST",
                    body: expect.objectContaining({ allVariants: true, grants: [] }),
                }),
            ),
        );
    });

    it("does not create a key without a name", async () => {
        serveManage({ keys, adminVariants, createdKey: created });

        renderKeys();
        await userEvent.click(await screen.findByRole("button", { name: "Create key" }));

        expect(await screen.findByRole("button", { name: "Create" })).toBeDisabled();
    });
});
