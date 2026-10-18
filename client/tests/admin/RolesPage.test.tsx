import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppRoutes } from "../../src/routing/routes";
import { adminMe, buildAdminUser } from "../mocks/fixtures";
import { renderWithProviders } from "../utils/renderWithProviders";
import { serveManage } from "./serveManage";

const users = [
    buildAdminUser({ uid: 1, role: "admin" }),
    buildAdminUser({ uid: 2, role: "manager", grants: ["flowaim"] }),
    buildAdminUser({ uid: 7, role: null, grants: ["flowaim", "reading"] }),
];
const usernames = { 1: "admin", 2: "manager", 7: "Newbie" };

function renderRoles() {
    return renderWithProviders(<AppRoutes />, { route: "/admin/roles", me: adminMe });
}

describe("RolesPage", () => {
    it("lists people with a role, with their username", async () => {
        serveManage({ users, usernames });

        renderRoles();

        const manager = (await screen.findByText("manager", { selector: "td" })).closest("tr")!;

        expect(within(manager).getByText("2")).toBeVisible();
        expect(within(manager).getByRole("combobox", { name: "Role of manager" })).toHaveValue(
            "manager",
        );

        // Somebody who only has grants has no role, so is not a person with a role.
        expect(screen.queryByText("Newbie")).not.toBeInTheDocument();
    });

    it("sets a role by uid", async () => {
        const sent = serveManage({ users, usernames });

        renderRoles();
        await userEvent.type(await screen.findByRole("textbox", { name: "User ID" }), "42");
        await userEvent.selectOptions(screen.getByRole("combobox", { name: "Role" }), "admin");
        await userEvent.click(screen.getByRole("button", { name: "Set role" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "PUT",
                path: "/api/manage/users/42/role",
                body: { role: "admin" },
            }),
        );
    });

    it("does not set a role for a uid that is not a number", async () => {
        serveManage({ users, usernames });

        renderRoles();
        await userEvent.type(await screen.findByRole("textbox", { name: "User ID" }), "abc");

        expect(screen.getByRole("button", { name: "Set role" })).toBeDisabled();
    });

    it("changes the role of a listed person at once", async () => {
        const sent = serveManage({ users, usernames });

        renderRoles();
        await userEvent.selectOptions(
            await screen.findByRole("combobox", { name: "Role of manager" }),
            "admin",
        );

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "PUT",
                path: "/api/manage/users/2/role",
                body: { role: "admin" },
            }),
        );
    });

    it("asks before removing a role, then sends null", async () => {
        const sent = serveManage({ users, usernames });

        renderRoles();
        await userEvent.click(
            await screen.findByRole("button", { name: "Remove role of manager" }),
        );

        const dialog = await screen.findByRole("dialog", { name: "Remove the role of manager?" });

        expect(sent).toHaveLength(0);

        await userEvent.click(within(dialog).getByRole("button", { name: "Remove role" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "PUT",
                path: "/api/manage/users/2/role",
                body: { role: null },
            }),
        );
    });

    it("asks before an admin demotes themselves, and sends nothing when cancelled", async () => {
        const sent = serveManage({ users, usernames });

        renderRoles();
        await userEvent.selectOptions(
            await screen.findByRole("combobox", { name: "Role of admin" }),
            "manager",
        );

        const dialog = await screen.findByRole("dialog", { name: "Change your own role?" });

        expect(within(dialog).getByText(/can no longer open the admin area/)).toBeVisible();
        expect(sent).toHaveLength(0);

        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

        expect(sent).toHaveLength(0);
    });

    it("demotes themselves once confirmed", async () => {
        const sent = serveManage({ users, usernames });

        renderRoles();
        await userEvent.selectOptions(
            await screen.findByRole("combobox", { name: "Role of admin" }),
            "manager",
        );
        await userEvent.click(
            within(await screen.findByRole("dialog", { name: "Change your own role?" })).getByRole(
                "button",
                { name: "Change role" },
            ),
        );

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "PUT",
                path: "/api/manage/users/1/role",
                body: { role: "manager" },
            }),
        );
    });

    it("warns when an admin removes their own role", async () => {
        serveManage({ users, usernames });

        renderRoles();
        await userEvent.click(await screen.findByRole("button", { name: "Remove role of admin" }));

        const dialog = await screen.findByRole("dialog", { name: "Remove the role of admin?" });

        expect(within(dialog).getByText(/can no longer open the admin area/)).toBeVisible();
    });

    it("sets a manager role for themselves through the form only after confirming", async () => {
        const sent = serveManage({ users, usernames });

        renderRoles();
        await userEvent.type(await screen.findByRole("textbox", { name: "User ID" }), "1");
        await userEvent.click(screen.getByRole("button", { name: "Set role" }));

        expect(await screen.findByRole("dialog", { name: "Change your own role?" })).toBeVisible();
        expect(sent).toHaveLength(0);
    });
});
