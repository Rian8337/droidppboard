import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { SkinListPage } from "../../src/pages/SkinListPage";
import { SkinPreviewPage } from "../../src/pages/SkinPreviewPage";
import { buildSkin } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

describe("SkinListPage", () => {
    it("lists the skins with a link to each preview", async () => {
        const requests: URL[] = [];

        server.use(
            http.get("/api/skins/search", ({ request }) => {
                requests.push(new URL(request.url));

                return HttpResponse.json([
                    buildSkin(),
                    buildSkin({ name: "Plain Skin", description: "" }),
                ]);
            }),
        );
        renderWithProviders(<SkinListPage />);

        expect(await screen.findByRole("link", { name: "Cool Skin" })).toHaveAttribute(
            "href",
            "/skin/1234/Cool%20Skin",
        );
        expect(screen.getByText("No description")).toBeVisible();
        expect(requests[0].searchParams.get("page")).toBe("1");
    });

    it("sends what is typed as the query", async () => {
        const requests: URL[] = [];

        server.use(
            http.get("/api/skins/search", ({ request }) => {
                requests.push(new URL(request.url));

                return HttpResponse.json([buildSkin()]);
            }),
        );
        renderWithProviders(<SkinListPage />);
        await screen.findByText("Cool Skin");
        await userEvent.type(screen.getByLabelText("Search skins"), "cool");

        await waitFor(() => expect(requests.at(-1)?.searchParams.get("query")).toBe("cool"));
    });
});

function renderPreview(route = "/skin/1234/Cool%20Skin") {
    return renderWithProviders(
        <Routes>
            <Route path="/skin/:discordid/:name" element={<SkinPreviewPage />} />
        </Routes>,
        { route },
    );
}

describe("SkinPreviewPage", () => {
    it("asks for the skin named in the address and shows it with its download and previews", async () => {
        const requests: URL[] = [];

        server.use(
            http.get("/api/skins/get", ({ request }) => {
                requests.push(new URL(request.url));

                return HttpResponse.json(
                    buildSkin({
                        previews: {
                            gameplay: {
                                messageId: "1",
                                attachmentURL: "https://example.com/g.png",
                            },
                        } as never,
                    }),
                );
            }),
        );
        renderPreview();

        expect(await screen.findByRole("heading", { name: "Cool Skin" })).toBeVisible();
        expect(requests[0].searchParams.get("discordid")).toBe("1234");
        expect(requests[0].searchParams.get("name")).toBe("Cool Skin");
        expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute(
            "href",
            "https://example.com/cool-skin.osk",
        );
        expect(screen.getByRole("img", { name: "Gameplay Preview" })).toHaveAttribute(
            "src",
            "https://example.com/g.png",
        );
    });

    it("says when a skin has no preview", async () => {
        server.use(http.get("/api/skins/get", () => HttpResponse.json(buildSkin())));
        renderPreview();

        expect(await screen.findByText("This skin does not have a preview.")).toBeVisible();
    });

    it("says so when the skin does not exist", async () => {
        server.use(http.get("/api/skins/get", () => HttpResponse.json(null)));
        renderPreview();

        expect(await screen.findByText("Skin not found")).toBeVisible();
    });

    it("offers no download for an address that is not a web address", async () => {
        server.use(
            http.get("/api/skins/get", () =>
                HttpResponse.json(buildSkin({ url: "javascript:alert(1)" })),
            ),
        );
        renderPreview();

        expect(await screen.findByRole("heading", { name: "Cool Skin" })).toBeVisible();
        expect(screen.queryByRole("link", { name: "Download" })).not.toBeInTheDocument();
        expect(screen.getByText("No download available.")).toBeVisible();
    });

    it("loads no preview image from an address that is not a web address", async () => {
        server.use(
            http.get("/api/skins/get", () =>
                HttpResponse.json(
                    buildSkin({
                        previews: {
                            gameplay: { messageId: "1", attachmentURL: "javascript:alert(1)" },
                            songSelection: {
                                messageId: "2",
                                attachmentURL: "data:image/svg+xml,<svg/>",
                            },
                        } as never,
                    }),
                ),
            ),
        );
        renderPreview();

        expect(await screen.findByText("This skin does not have a preview.")).toBeVisible();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
});
