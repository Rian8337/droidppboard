import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    execute: vi.fn(),
}));

vi.mock("../database/official", () => ({
    officialDb: { execute: mocks.execute },
}));

import { OsuDroidAccounts } from "./OsuDroidAccounts";

describe("OsuDroidAccounts.getCountries", () => {
    beforeEach(() => {
        mocks.execute.mockReset();
    });

    it("reads the regions of the unique uids in one query", async () => {
        mocks.execute.mockResolvedValue([[]]);

        await OsuDroidAccounts.getCountries([1, 2, 1, 3]);

        expect(mocks.execute).toHaveBeenCalledTimes(1);
        expect(mocks.execute).toHaveBeenCalledWith(
            "SELECT id, region FROM bbl_user WHERE id IN (?, ?, ?)",
            [1, 2, 3],
        );
    });

    it("does not query when there are no uids", async () => {
        const countries = await OsuDroidAccounts.getCountries([]);

        expect(countries.size).toBe(0);
        expect(mocks.execute).not.toHaveBeenCalled();
    });

    it("uppercases and trims the codes", async () => {
        mocks.execute.mockResolvedValue([
            [
                { id: 1, region: "id" },
                { id: 2, region: " Us " },
                { id: 3, region: "DE" },
            ],
        ]);

        const countries = await OsuDroidAccounts.getCountries([1, 2, 3]);

        expect([...countries]).toEqual([
            [1, "ID"],
            [2, "US"],
            [3, "DE"],
        ]);
    });

    it("leaves out regions that are not two letters", async () => {
        mocks.execute.mockResolvedValue([
            [
                { id: 1, region: "idn" },
                { id: 2, region: "" },
                { id: 3, region: "1a" },
                { id: 4, region: null },
                { id: 5, region: "j p" },
                { id: 6, region: "jp" },
            ],
        ]);

        const countries = await OsuDroidAccounts.getCountries([
            1, 2, 3, 4, 5, 6,
        ]);

        expect([...countries]).toEqual([[6, "JP"]]);
    });

    it("leaves out accounts that do not exist", async () => {
        mocks.execute.mockResolvedValue([[{ id: 1, region: "id" }]]);

        const countries = await OsuDroidAccounts.getCountries([1, 2]);

        expect(countries.has(2)).toBe(false);
    });
});
