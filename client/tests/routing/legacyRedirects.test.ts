import { mapLegacyPath } from "../../src/routing/legacyRedirects";

describe("mapLegacyPath", () => {
    it.each([
        ["/prototype/droid-rebalance", "/v/droid-rebalance/leaderboard"],
        ["/prototype/leaderboard/droid-rebalance", "/v/droid-rebalance/leaderboard"],
        ["/prototype/top-plays/reading", "/v/reading/top-plays"],
        ["/prototype/profile/1234/reading", "/v/reading/players/1234"],
        ["/prototype/queue", "/v/droid-rebalance/queue"],
        ["/prototype/calculate", "/v/droid-rebalance/calculator"],
        ["/manage", "/admin/roles"],
        ["/manage/users", "/admin/roles"],
        ["/manage/keys", "/admin/keys"],
        ["/manage/variants/flowaim", "/admin/variants/flowaim"],
    ])("maps %s to %s", (legacy, expected) => {
        expect(mapLegacyPath(legacy)).toBe(expected);
    });

    it("ignores a trailing slash", () => {
        expect(mapLegacyPath("/manage/keys/")).toBe("/admin/keys");
    });

    it("decodes the segments and encodes them again", () => {
        expect(mapLegacyPath("/prototype/leaderboard/My%20Variant")).toBe(
            "/v/My%20Variant/leaderboard",
        );
        expect(mapLegacyPath("/manage/variants/a b")).toBe("/admin/variants/a%20b");
        expect(mapLegacyPath("/prototype/top-plays/a%2Fb")).toBe("/v/a%2Fb/top-plays");
    });

    it.each([
        "/v/x/leaderboard",
        "/",
        "/prototype",
        "/prototype/profile/1234",
        "/prototype/profile/1e3/reading",
        "/prototype/profile/0x10/reading",
        "/prototype/profile/-5/reading",
        "/prototype/profile/abc/reading",
        "/prototype/unknown/a/b",
        "/manage/unknown",
        "/manage/variants",
        "/prototype/%E0%A4%A",
    ])("returns null for %s", (pathname) => {
        expect(mapLegacyPath(pathname)).toBeNull();
    });
});
