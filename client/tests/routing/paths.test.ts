import { getProfilePath, getSnapshotPath, getVariantPath } from "../../src/routing/paths";

describe("paths", () => {
    it("builds a variant path, to the leaderboard by default", () => {
        expect(getVariantPath("reading")).toBe("/v/reading/leaderboard");
        expect(getVariantPath("reading", "queue")).toBe("/v/reading/queue");
    });

    it("encodes the variant name", () => {
        expect(getVariantPath("a b/c")).toBe("/v/a%20b%2Fc/leaderboard");
    });

    it("builds a profile path", () => {
        expect(getProfilePath("reading", 1234)).toBe("/v/reading/players/1234");
    });

    it("builds a snapshot path for each scope", () => {
        expect(getSnapshotPath("variant", "reading", "abc123")).toBe(
            "/v/reading/calculator/s/abc123",
        );
        expect(getSnapshotPath("tool", "osu-live", "abc123")).toBe("/calculate/s/abc123");
    });
});
