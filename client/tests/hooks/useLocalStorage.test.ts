import { act, renderHook } from "@testing-library/react";
import { useLocalStorage } from "../../src/hooks/useLocalStorage";

describe("useLocalStorage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns the initial value when nothing is stored", () => {
        const { result } = renderHook(() => useLocalStorage("key", "initial"));

        expect(result.current[0]).toBe("initial");
    });

    it("persists and reads back values", () => {
        const first = renderHook(() => useLocalStorage("key", "initial"));

        act(() => first.result.current[1]("changed"));

        expect(localStorage.getItem("key")).toBe(JSON.stringify("changed"));

        const second = renderHook(() => useLocalStorage("key", "initial"));

        expect(second.result.current[0]).toBe("changed");
    });

    it("ignores stored text that is not valid JSON", () => {
        localStorage.setItem("key", "{oops");

        const { result } = renderHook(() => useLocalStorage("key", "initial"));

        expect(result.current[0]).toBe("initial");
    });

    it("survives a throwing localStorage and keeps the value in memory", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("blocked");
        });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("blocked");
        });

        const { result } = renderHook(() => useLocalStorage("key", "initial"));

        expect(result.current[0]).toBe("initial");

        act(() => result.current[1]("changed"));

        expect(result.current[0]).toBe("changed");
    });
});
