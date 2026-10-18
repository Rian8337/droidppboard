import { readFileSync } from "node:fs";

/** The site's version, which is the version of the repository's root `package.json`. */
export function readAppVersion(): string {
    const manifest = JSON.parse(
        readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { version: string };

    return manifest.version;
}
