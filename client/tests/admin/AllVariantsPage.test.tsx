import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppRoutes } from "../../src/routing/routes";
import { adminMe, buildAdminKey, buildAdminVariant } from "../mocks/fixtures";
import { renderWithProviders } from "../utils/renderWithProviders";
import { serveManage } from "./serveManage";

const adminVariants = [
    buildAdminVariant({ name: "droid-live", title: "Live" }),
    buildAdminVariant({ name: "droid-rebalance", title: "Rebalance" }),
    buildAdminVariant({ name: "osu-live", title: "osu! live" }),
    buildAdminVariant({ name: "flowaim", public: false, aliases: ["flow"] }),
];

describe("AllVariantsPage", () => {
    it("lists every variant, including droid-live and osu-live", async () => {
        serveManage({ adminVariants });

        renderWithProviders(<AppRoutes />, { route: "/admin/variants", me: adminMe });

        // The sidebar lists the public variants too, so only the table is looked in.
        const table = within(await screen.findByRole("table"));

        expect(await table.findByText("droid-live")).toBeVisible();
        expect(table.getByText("osu-live")).toBeVisible();
        expect(table.getByText("droid-rebalance")).toBeVisible();

        const flowaim = table.getByText("flowaim").closest("tr")!;

        expect(within(flowaim).getByText("Private")).toBeVisible();
        expect(within(flowaim).getByText("flow")).toBeVisible();
    });

    it("opens a variant's settings and access", async () => {
        serveManage({
            adminVariants,
            grants: [7],
            usernames: { 7: "Newbie" },
            keys: [buildAdminKey({ name: "bot", grants: ["osu-live"] })],
        });

        renderWithProviders(<AppRoutes />, { route: "/admin/variants", me: adminMe });
        await userEvent.click(await screen.findByText("osu-live"));

        expect(await screen.findByRole("heading", { name: "osu! live" })).toBeVisible();
        expect(await screen.findByText("Newbie")).toBeVisible();
        expect(await screen.findByText("bot")).toBeVisible();

        await userEvent.click(screen.getByRole("button", { name: "Edit settings" }));

        expect(await screen.findByRole("dialog", { name: "Edit settings" })).toBeVisible();
    });

    it("opens a variant straight from its address, which is also where /manage/variants leads", async () => {
        serveManage({ adminVariants });

        renderWithProviders(<AppRoutes />, { route: "/manage/variants/droid-live", me: adminMe });

        expect(await screen.findByRole("heading", { name: "Live" })).toBeVisible();
        // A full run belongs to the board's variants; this page has no control for it.
        expect(
            screen.queryByRole("button", { name: /Start|Continue|Restart/ }),
        ).not.toBeInTheDocument();
    });

    it("says so for a variant that does not exist", async () => {
        serveManage({ adminVariants });

        renderWithProviders(<AppRoutes />, { route: "/admin/variants/nope", me: adminMe });

        expect(await screen.findByText("Rework not found")).toBeVisible();
    });
});
