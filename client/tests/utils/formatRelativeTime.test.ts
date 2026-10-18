import { formatRelativeTime } from "../../src/utils/formatRelativeTime";

describe("formatRelativeTime", () => {
    const now = Date.parse("2026-10-18T12:00:00.000Z");

    function ago(milliseconds: number): string {
        return formatRelativeTime(new Date(now - milliseconds).toISOString(), now);
    }

    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;

    it.each([
        [10_000, "just now"],
        [5 * minute, "5 minutes ago"],
        [minute, "1 minute ago"],
        [3 * hour, "3 hours ago"],
        [6 * day, "6 days ago"],
        [14 * day, "2 weeks ago"],
        [40 * day, "1 month ago"],
        [200 * day, "6 months ago"],
        [800 * day, "2 years ago"],
    ])("formats %d ms as %s", (elapsed, expected) => {
        expect(ago(elapsed)).toBe(expected);
    });

    it("treats a time in the future as just now", () => {
        expect(ago(-5 * minute)).toBe("just now");
    });
});
