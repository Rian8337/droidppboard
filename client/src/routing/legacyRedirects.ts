import { defaultVariant, getProfilePath, getVariantPath } from "./paths";

function decodeSegments(pathname: string): string[] | null {
    try {
        return pathname
            .split("/")
            .filter((segment) => segment !== "")
            .map(decodeURIComponent);
    } catch {
        // A malformed escape such as "%E0%A4%A".
        return null;
    }
}

function encodePath(...segments: string[]): string {
    return `/${segments.map(encodeURIComponent).join("/")}`;
}

/**
 * Maps a path of the old site to where its page lives now, so that links people shared keep
 * working. Returns `null` for a path that is not an old one.
 */
export function mapLegacyPath(pathname: string): string | null {
    const segments = decodeSegments(pathname);

    if (segments === null) {
        return null;
    }

    const [first, second, third, fourth] = segments;

    if (first === "prototype") {
        switch (segments.length) {
            case 2:
                if (second === "queue") {
                    return getVariantPath(defaultVariant, "queue");
                }

                if (second === "calculate") {
                    return getVariantPath(defaultVariant, "calculator");
                }

                return getVariantPath(second);
            case 3:
                if (second === "leaderboard") {
                    return getVariantPath(third);
                }

                if (second === "top-plays") {
                    return getVariantPath(third, "top-plays");
                }

                return null;
            case 4: {
                return second === "profile" && /^\d+$/.test(third)
                    ? getProfilePath(fourth, Number(third))
                    : null;
            }
            default:
                return null;
        }
    }

    if (first === "manage") {
        switch (segments.length) {
            case 1:
                return "/admin/roles";
            case 2:
                if (second === "users") {
                    return "/admin/roles";
                }

                return second === "keys" ? "/admin/keys" : null;
            case 3:
                return second === "variants" ? encodePath("admin", "variants", third) : null;
            default:
                return null;
        }
    }

    return null;
}
