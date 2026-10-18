import { act, renderHook, waitFor } from "@testing-library/react";
import { useTurnstile } from "../../src/hooks/useTurnstile";

describe("useTurnstile", () => {
    afterEach(() => {
        delete window.turnstile;
    });

    it("clears the captcha error when the widget is reset for another try", async () => {
        window.turnstile = {
            render: (_container, options) => {
                options["error-callback"]();

                return "widget";
            },
            reset: vi.fn(),
            remove: vi.fn(),
        };

        const { result } = renderHook(() => {
            const turnstile = useTurnstile("site-key", () => {});

            // The widget needs an element to be drawn in.
            turnstile.containerRef.current ??= document.createElement("div");

            return turnstile;
        });

        await waitFor(() => expect(result.current.error).not.toBeNull());

        act(() => result.current.reset());

        expect(result.current.error).toBeNull();
    });
});
