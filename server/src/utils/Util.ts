import { TopPrototypePPEntry } from "app-structures";
import { Request, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { ModMap, ModUtil } from "@rian8337/osu-base";
import { join } from "path";
import { ReadStream } from "fs";
import { DatabaseManager } from "../database/managers/DatabaseManager";

/**
 * Comparisons used for searching whitelisted beatmaps.
 */
export type Comparison = "<=" | "<" | "=" | ">" | ">=";

/**
 * Some utilities, no biggie.
 */
export abstract class Util {
    /**
     * List of all top prototype plays from all players mapped by rework type, regardless of mods.
     */
    static readonly allTopEntries = new Map<string, TopPrototypePPEntry[]>();

    /**
     * List of top prototype plays from all players, mapped by rework type, and each map inside the
     * rework type mapped by their mods.
     */
    private static readonly topPrototypePPList = new Map<
        string,
        Map<ModMap, TopPrototypePPEntry[]>
    >();

    /**
     * Creates a middleware used for handling excessive API requests.
     *
     * @param maxRequests The amount of requests allowed.
     * @param windowMs The time to refresh rate limiting. Defaults to 10 seconds.
     */
    static createRateLimit(
        maxRequests: number,
        windowMs: number = 10 * 1000,
    ): RequestHandler {
        return rateLimit({
            windowMs: windowMs,
            max: maxRequests,
            standardHeaders: true,
            legacyHeaders: false,
            message: "You have been rate limited. Please try again later.",
        });
    }

    /**
     * Gets the path to frontend directory.
     */
    static getFrontendPath(): string {
        return join(process.cwd(), "../client");
    }

    /**
     * Checks if a request is requesting prototype data.
     *
     * @param req The request.
     */
    static requestIsPrototype(req: Request<unknown>): boolean {
        return req.baseUrl.includes("prototype") || req.body.prototype;
    }

    /**
     * Reads a file stream and returns it as a buffer.
     *
     * @param stream The stream.
     */
    static readFile(stream: ReadStream): Promise<Buffer> {
        const chunks: Buffer[] = [];

        return new Promise((resolve, reject) => {
            stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on("error", (err) => reject(err));
            stream.on("end", () => resolve(Buffer.concat(chunks)));
        });
    }

    static convertURI(input: string): string {
        input = decodeURIComponent(input);

        const arr = input.split("");

        for (let i = 0; i < arr.length; ++i) {
            if (i !== arr.length - 1 && arr[i] === "+" && arr[i + 1] !== "+") {
                arr[i] = " ";
            }
        }

        return arr.join("");
    }

    static convertURIregex(input: string): string {
        input = decodeURIComponent(input);

        const arr = input.split("");

        const characterToReplace = "*?$()[]\"':";

        for (let i = 0; i < arr.length; ++i) {
            if (characterToReplace.includes(arr[i])) {
                arr[i] = `[${arr[i]}]`;
            }

            if (i !== arr.length - 1 && arr[i] === "+" && arr[i + 1] !== "+") {
                arr[i] = " ";
            }

            if (arr[i] === "+") {
                arr[i] = "[+]";
            }
        }

        return arr.join("");
    }

    static getComparisonText(comparison: Comparison): string {
        switch (comparison) {
            case "<":
                return "$lt";
            case "<=":
                return "$lte";
            case ">":
                return "$gt";
            case ">=":
                return "$gte";
            default:
                return "$eq";
        }
    }

    static getComparisonObject(comparison: Comparison, value: number): object {
        return Object.defineProperty({}, this.getComparisonText(comparison), {
            value,
            writable: true,
            configurable: true,
            enumerable: true,
        });
    }

    static refreshPrototypeTopPP(): void {
        // Prototype pp is different as there are multiple rework types.
        DatabaseManager.aliceDb.collections.prototypePP
            .get(
                {},
                { projection: { _id: 0, username: 1, pp: 1, reworkType: 1 } },
            )
            .then((res) => {
                this.allTopEntries.clear();
                this.topPrototypePPList.clear();

                for (const player of res) {
                    const ppEntries = player.pp;

                    if (!this.topPrototypePPList.has(player.reworkType)) {
                        this.topPrototypePPList.set(
                            player.reworkType,
                            new Map<ModMap, TopPrototypePPEntry[]>(),
                        );
                    }

                    const reworkTypeMap = this.topPrototypePPList.get(
                        player.reworkType,
                    )!;

                    if (!this.allTopEntries.has(player.reworkType)) {
                        this.allTopEntries.set(player.reworkType, []);
                    }

                    for (const ppEntry of ppEntries) {
                        const topEntry: TopPrototypePPEntry = {
                            ...ppEntry,
                            username: player.username,
                        };

                        this.allTopEntries
                            .get(player.reworkType)!
                            .push(topEntry);

                        const convertedMods = ModUtil.deserializeMods(
                            topEntry.mods,
                        );

                        let entries = this.getTopPrototypePP(
                            player.reworkType,
                            convertedMods,
                        );

                        if (entries === null) {
                            entries = [];
                            reworkTypeMap.set(convertedMods, entries);
                        }

                        entries.push(topEntry);
                    }
                }

                for (const entries of this.allTopEntries.values()) {
                    entries.sort((a, b) => b.pp - a.pp);
                    entries.splice(100);
                }

                for (const rework of this.topPrototypePPList.values()) {
                    for (const plays of rework.values()) {
                        plays.sort((a, b) => b.pp - a.pp);
                        plays.splice(100);
                    }
                }
            })
            .finally(() => {
                setTimeout(() => this.refreshPrototypeTopPP(), 1800 * 1000);
            });
    }

    static getTopPrototypePP(
        type: string,
        mods?: ModMap,
    ): TopPrototypePPEntry[] | null {
        if (!mods) {
            return this.allTopEntries.get(type) ?? [];
        }

        const rework = this.topPrototypePPList.get(type);

        if (!rework) {
            return [];
        }

        for (const [map, entries] of rework) {
            if (map.equals(mods)) {
                return entries;
            }
        }

        return null;
    }

    /**
     * Downloads a beatmap's .osu file.
     *
     * @param beatmapId The ID of the beatmap to download.
     */
    static async downloadBeatmap(beatmapId: number): Promise<string> {
        try {
            const res = await fetch(
                `http://localhost:3017/api/beatmap/getbeatmapfile?key=${process.env.DROID_SERVER_INTERNAL_KEY}&id=${beatmapId}`,
            );

            if (!res.ok) {
                return "";
            }

            return res.text();
        } catch {
            return "";
        }
    }
}
