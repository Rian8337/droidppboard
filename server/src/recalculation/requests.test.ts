import { describe, expect, it } from "vitest";
import { parseFullRunStartRequest, parseQueueRequest } from "./requests";

describe("parseQueueRequest", () => {
    it("accepts a variant with a uid or a username", () => {
        expect(parseQueueRequest({ variant: "v", uid: 5 })).toEqual({
            variant: "v",
            player: 5,
        });
        expect(
            parseQueueRequest({ variant: "v", username: "Rian8337" }),
        ).toEqual({ variant: "v", player: "Rian8337" });
    });

    it("rejects both or neither of uid and username", () => {
        expect(
            parseQueueRequest({ variant: "v", uid: 5, username: "Rian8337" }),
        ).toBeNull();
        expect(parseQueueRequest({ variant: "v" })).toBeNull();
    });

    it("trims usernames and rejects bad uids", () => {
        expect(parseQueueRequest({ variant: "v", username: "  ab  " })).toEqual(
            {
                variant: "v",
                player: "ab",
            },
        );
        expect(parseQueueRequest({ variant: "v", username: " a " })).toBeNull();
        expect(
            parseQueueRequest({ variant: "v", username: "a".repeat(21) }),
        ).toBeNull();

        for (const uid of [0, -1, 1.5, "12", null]) {
            expect(parseQueueRequest({ variant: "v", uid })).toBeNull();
        }
    });

    it("rejects a missing or empty variant and non-object bodies", () => {
        expect(parseQueueRequest({ uid: 5 })).toBeNull();
        expect(parseQueueRequest({ variant: "", uid: 5 })).toBeNull();
        expect(parseQueueRequest({ variant: 3, uid: 5 })).toBeNull();
        expect(parseQueueRequest(null)).toBeNull();
        expect(parseQueueRequest("x")).toBeNull();
    });
});

describe("parseFullRunStartRequest", () => {
    it("defaults restart to false", () => {
        expect(parseFullRunStartRequest({})).toEqual({ restart: false });
        expect(parseFullRunStartRequest(undefined)).toEqual({ restart: false });
    });

    it("reads a boolean restart and rejects anything else", () => {
        expect(parseFullRunStartRequest({ restart: true })).toEqual({
            restart: true,
        });
        expect(parseFullRunStartRequest({ restart: "yes" })).toBeNull();
        expect(parseFullRunStartRequest("x")).toBeNull();
    });
});
