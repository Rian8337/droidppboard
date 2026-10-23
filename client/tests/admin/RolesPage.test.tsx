import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppRoutes } from "../../src/routing/routes";
import { adminMe, buildAdminUser, ownerMe } from "../mocks/fixtures";
import { renderWithProviders } from "../utils/renderWithProviders";
import { serveManage } from "./serveManage";

const users = [
    buildAdminUser({ uid: 3, role: "owner" }),
    buildAdminUser({ uid: 1, role: "admin" }),
    buildAdminUser({ uid: 2, role: "manager", grants: ["flowaim"] }),
    buildAdminUser({ uid: 7, role: null, grants: ["flowaim", "reading"] }),
];
const usernames = { 1: "admin", 2: "manager", 3: "owner", 7: "Newbie" };

function renderRoles(me = ownerMe) {
    return renderWithProviders(<AppRoutes />, { route: "/admin/roles", me });
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

    it("shows their own role without a way to change or remove it", async () => {
        serveManage({ users, usernames });

        renderRoles();

        const own = (await screen.findByText("Owner (you)")).closest("tr")!;

        expect(within(own).queryByRole("combobox")).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Remove role of owner" }),
        ).not.toBeInTheDocument();
    });

    it("refuses their own uid in the form", async () => {
        const sent = serveManage({ users, usernames });

        renderRoles();
        await userEvent.type(await screen.findByRole("textbox", { name: "User ID" }), "3");

        expect(screen.getByText("You cannot change your own role.")).toBeVisible();
        expect(screen.getByRole("button", { name: "Set role" })).toBeDisabled();
        expect(sent).toHaveLength(0);
    });

    it("lets an owner change and remove an admin's role", async () => {
        serveManage({ users, usernames });

        renderRoles();

        expect(await screen.findByRole("combobox", { name: "Role of admin" })).toHaveValue("admin");
        expect(screen.getByRole("button", { name: "Remove role of admin" })).toBeVisible();
    });

    it("shows another owner without a way to change them", async () => {
        serveManage({
            users: [...users, buildAdminUser({ uid: 4, role: "owner" })],
            usernames: { ...usernames, 4: "cofounder" },
        });

        renderRoles();

        const other = (await screen.findByText("cofounder")).closest("tr")!;

        expect(within(other).getByText("Owner")).toBeVisible();
        expect(within(other).queryByRole("combobox")).not.toBeInTheDocument();
        expect(within(other).queryByRole("button")).not.toBeInTheDocument();

        await userEvent.type(screen.getByRole("textbox", { name: "User ID" }), "4");

        expect(
            screen.getByText("Owners can only be changed on the broker's server."),
        ).toBeVisible();
        expect(screen.getByRole("button", { name: "Set role" })).toBeDisabled();
    });
});

describe("RolesPage for an admin", () => {
    it("offers only the manager role in the form", async () => {
        const sent = serveManage({ users, usernames });

        renderRoles(adminMe);

        const select = await screen.findByRole("combobox", { name: "Role" });

        expect(
            within(select)
                .getAllByRole("option")
                .map((option) => option.textContent),
        ).toEqual(["Manager"]);

        await userEvent.type(screen.getByRole("textbox", { name: "User ID" }), "42");
        await userEvent.click(screen.getByRole("button", { name: "Set role" }));

        await waitFor(() =>
            expect(sent).toContainEqual({
                method: "PUT",
                path: "/api/manage/users/42/role",
                body: { role: "manager" },
            }),
        );
    });

    it("lets them remove a manager's role, but not change it to another", async () => {
        serveManage({ users, usernames });

        renderRoles(adminMe);

        const manager = (await screen.findByText("manager", { selector: "td" })).closest("tr")!;

        expect(within(manager).getByText("Manager")).toBeVisible();
        expect(within(manager).queryByRole("combobox")).not.toBeInTheDocument();
        expect(
            within(manager).getByRole("button", { name: "Remove role of manager" }),
        ).toBeVisible();
    });

    it("shows the owners and other admins without a way to change them", async () => {
        serveManage({
            users: [...users, buildAdminUser({ uid: 5, role: "admin" })],
            usernames: { ...usernames, 5: "colleague" },
        });

        renderRoles(adminMe);

        for (const name of ["owner", "colleague"]) {
            const row = (await screen.findByText(name, { selector: "td" })).closest("tr")!;

            expect(within(row).queryByRole("combobox")).not.toBeInTheDocument();
            expect(within(row).queryByRole("button")).not.toBeInTheDocument();
        }

        await userEvent.type(screen.getByRole("textbox", { name: "User ID" }), "5");

        expect(screen.getByText("Only an owner can change an admin's role.")).toBeVisible();
        expect(screen.getByRole("button", { name: "Set role" })).toBeDisabled();
    });
});
