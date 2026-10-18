import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../database/managers/DatabaseManager", () => ({
    DatabaseManager: {},
}));

describe("startCapacityRefresh", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("refreshes the calculator counts every 15 seconds and survives a failure", async () => {
        const { recalculationQueue, startCapacityRefresh } =
            await import("./instance");
        const refresh = vi
            .spyOn(recalculationQueue, "refreshCapacities")
            .mockRejectedValueOnce(new Error("secret detail"))
            .mockResolvedValue();
        const error = vi.spyOn(console, "error").mockImplementation(() => {});

        startCapacityRefresh();

        await vi.advanceTimersByTimeAsync(14_999);
        expect(refresh).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);
        expect(String(error.mock.calls[0])).not.toContain("secret detail");

        await vi.advanceTimersByTimeAsync(15_000);
        expect(refresh).toHaveBeenCalledTimes(2);
        expect(error).toHaveBeenCalledTimes(1);

        vi.clearAllTimers();
    });
});
