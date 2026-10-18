import { http, HttpResponse } from "msw";
import { ApiError, requestJson } from "../../src/api/http";
import { server } from "../mocks/server";

async function catchError(promise: Promise<unknown>): Promise<ApiError> {
    try {
        await promise;
    } catch (error) {
        expect(error).toBeInstanceOf(ApiError);

        return error as ApiError;
    }

    throw new Error("Expected the request to fail");
}

describe("requestJson", () => {
    it("returns the parsed body", async () => {
        server.use(http.get("/api/thing", () => HttpResponse.json({ value: 3 })));

        await expect(requestJson<{ value: number }>("GET", "/api/thing")).resolves.toEqual({
            value: 3,
        });
    });

    it("returns undefined for an empty response", async () => {
        server.use(http.post("/api/thing", () => new HttpResponse(null, { status: 204 })));

        await expect(requestJson("POST", "/api/thing", {})).resolves.toBeUndefined();
    });

    it("sends a JSON body with a content type", async () => {
        let received: { contentType: string | null; body: unknown } | undefined;

        server.use(
            http.post("/api/thing", async ({ request }) => {
                received = {
                    contentType: request.headers.get("Content-Type"),
                    body: await request.json(),
                };

                return HttpResponse.json({});
            }),
        );

        await requestJson("POST", "/api/thing", { a: 1 });

        expect(received).toEqual({ contentType: "application/json", body: { a: 1 } });
    });

    it("sends form data without a JSON content type", async () => {
        let contentType: string | null = null;

        server.use(
            http.post("/api/thing", ({ request }) => {
                contentType = request.headers.get("Content-Type");

                return HttpResponse.json({});
            }),
        );

        const form = new FormData();
        form.set("file", new Blob(["x"]), "x.osu");

        await requestJson("POST", "/api/thing", form);

        expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
    });

    it("maps a 429 with Retry-After to retryAfterSeconds", async () => {
        server.use(
            http.get(
                "/api/thing",
                () =>
                    new HttpResponse(null, {
                        status: 429,
                        headers: { "Retry-After": "12" },
                    }),
            ),
        );

        const error = await catchError(requestJson("GET", "/api/thing"));

        expect(error.status).toBe(429);
        expect(error.retryAfterSeconds).toBe(12);
        expect(error.message).toBe("You are being rate limited. Please try again later");
    });

    it("maps a network failure to status 0", async () => {
        server.use(http.get("/api/thing", () => HttpResponse.error()));

        const error = await catchError(requestJson("GET", "/api/thing"));

        expect(error.status).toBe(0);
        expect(error.message).toBe("Could not reach the server");
        expect(error.retryAfterSeconds).toBeUndefined();
    });

    it("uses the message of the server's error body", async () => {
        server.use(
            http.get("/api/thing", () =>
                HttpResponse.json({ message: "Rework not found" }, { status: 404 }),
            ),
        );

        const error = await catchError(requestJson("GET", "/api/thing"));

        expect(error.status).toBe(404);
        expect(error.message).toBe("Rework not found");
    });

    it("uses the message of a broker error body", async () => {
        server.use(
            http.get("/api/thing", () =>
                HttpResponse.json(
                    { error: { code: "conflict", message: "Name taken" } },
                    { status: 409 },
                ),
            ),
        );

        const error = await catchError(requestJson("GET", "/api/thing"));

        expect(error.message).toBe("Name taken");
    });

    it("prefers the server's message on a 429", async () => {
        server.use(
            http.get("/api/thing", () =>
                HttpResponse.json(
                    { message: "At most 5 snapshots per minute" },
                    { status: 429, headers: { "Retry-After": "30" } },
                ),
            ),
        );

        const error = await catchError(requestJson("GET", "/api/thing"));

        expect(error.message).toBe("At most 5 snapshots per minute");
        expect(error.retryAfterSeconds).toBe(30);
    });

    it("falls back to the status when the body has no message", async () => {
        server.use(http.get("/api/thing", () => new HttpResponse("oops", { status: 502 })));

        const error = await catchError(requestJson("GET", "/api/thing"));

        expect(error.status).toBe(502);
        expect(error.message).toBe("Request failed with status 502");
    });

    it("ignores a Retry-After that is not a number of seconds", async () => {
        server.use(
            http.get(
                "/api/thing",
                () =>
                    new HttpResponse(null, {
                        status: 429,
                        headers: { "Retry-After": "soon" },
                    }),
            ),
        );

        const error = await catchError(requestJson("GET", "/api/thing"));

        expect(error.retryAfterSeconds).toBeUndefined();
    });
});
