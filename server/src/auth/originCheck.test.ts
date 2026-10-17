import { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { requireAllowedOrigin } from "./originCheck";

const allowed = ["https://droidpp.osudroid.moe", "http://localhost:3000"];

function run(method: string, origin?: string) {
    const req = {
        method,
        headers: origin === undefined ? {} : { origin },
        get: (name: string) =>
            name.toLowerCase() === "origin" ? origin : undefined,
    } as unknown as Request;

    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status } as unknown as Response;
    const next = vi.fn();

    requireAllowedOrigin(allowed)(req, res, next);

    return { status, json, next };
}

describe("requireAllowedOrigin", () => {
    it("allows reads from anywhere", () => {
        for (const method of ["GET", "HEAD", "OPTIONS"]) {
            for (const origin of [undefined, "https://evil.example"]) {
                const { next, status } = run(method, origin);

                expect(next).toHaveBeenCalledOnce();
                expect(status).not.toHaveBeenCalled();
            }
        }
    });

    it("rejects state-changing requests from other origins", () => {
        for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
            const { next, status, json } = run(method, "https://evil.example");

            expect(next).not.toHaveBeenCalled();
            expect(status).toHaveBeenCalledWith(403);
            expect(json).toHaveBeenCalledWith({ message: "Forbidden" });
        }
    });

    it("rejects state-changing requests without an origin", () => {
        const { next, status } = run("POST");

        expect(next).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(403);
    });

    it("rejects origins that only resemble an allowed one", () => {
        for (const origin of [
            "https://droidpp.osudroid.moe.evil.example",
            "https://droidpp.osudroid.moe/",
            "http://droidpp.osudroid.moe",
            "null",
        ]) {
            expect(run("POST", origin).status).toHaveBeenCalledWith(403);
        }
    });

    it("allows state-changing requests from allowed origins", () => {
        for (const origin of allowed) {
            const { next, status } = run("POST", origin);

            expect(next).toHaveBeenCalledOnce();
            expect(status).not.toHaveBeenCalled();
        }
    });
});
