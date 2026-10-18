import { useSyncExternalStore } from "react";

export type Breakpoint = "phone" | "tablet" | "desktop";

const phoneQuery = "(max-width: 639px)";
const desktopQuery = "(min-width: 1024px)";

function hasMatchMedia(): boolean {
    return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function subscribe(onChange: () => void): () => void {
    if (!hasMatchMedia()) {
        return () => {};
    }

    const lists = [window.matchMedia(phoneQuery), window.matchMedia(desktopQuery)];

    for (const list of lists) {
        list.addEventListener("change", onChange);
    }

    return () => {
        for (const list of lists) {
            list.removeEventListener("change", onChange);
        }
    };
}

function getSnapshot(): Breakpoint {
    if (!hasMatchMedia()) {
        return "desktop";
    }

    if (window.matchMedia(desktopQuery).matches) {
        return "desktop";
    }

    return window.matchMedia(phoneQuery).matches ? "phone" : "tablet";
}

/** The current layout size: phone below 640px, tablet 640-1023px, desktop from 1024px. */
export function useBreakpoint(): Breakpoint {
    return useSyncExternalStore(subscribe, getSnapshot, () => "desktop");
}
