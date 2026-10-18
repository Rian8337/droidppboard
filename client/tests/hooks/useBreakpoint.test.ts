import { renderHook } from "@testing-library/react";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";

function stubMatchMedia(width: number) {
    vi.stubGlobal("matchMedia", (query: string) => {
        const min = /min-width:\s*(\d+)px/.exec(query);
        const max = /max-width:\s*(\d+)px/.exec(query);

        return {
            media: query,
            matches: (!min || width >= Number(min[1])) && (!max || width <= Number(max[1])),
            addEventListener: () => {},
            removeEventListener: () => {},
        };
    });
}

describe("useBreakpoint", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it.each([
        [390, "phone"],
        [639, "phone"],
        [640, "tablet"],
        [768, "tablet"],
        [1023, "tablet"],
        [1024, "desktop"],
        [1440, "desktop"],
    ])("returns the right size at %ipx", (width, expected) => {
        stubMatchMedia(width);

        const { result } = renderHook(() => useBreakpoint());

        expect(result.current).toBe(expected);
    });
});
