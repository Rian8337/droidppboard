import { TopPPEntry, TopPrototypePPEntry } from "app-structures";
import { Request, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { ModUtil } from "@rian8337/osu-base";
import { join } from "path";
import { registerFont } from "canvas";
import request from "request";
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
     * List of top plays from all players, mapped by droid mod string that's sorted alphabetically.
     */
    static readonly topPPList = new Map<string, TopPPEntry[]>();

    /**
     * List of top prototype plays from all players, mapped by droid mod string that's sorted alphabetically.
     */
    static readonly topPrototypePPList = new Map<
        string,
        TopPrototypePPEntry[]
    >();

    /**
     * Creates a middleware used for handling excessive API requests.
     *
     * @param maxRequests The amount of requests allowed.
     * @param windowMs The time to refresh rate limiting. Defaults to 10 seconds.
     */
    static createRateLimit(
        maxRequests: number,
        windowMs: number = 10 * 1000
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
    static requestIsPrototype(req: Request): boolean {
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

    static initCanvas(): void {
        registerFont(
            join(this.getFrontendPath(), "src", "fonts", "Exo-Medium.ttf"),
            { family: "Exo" }
        );
        registerFont(
            join(this.getFrontendPath(), "src", "fonts", "Exo-SemiBold.ttf"),
            { family: "Exo", style: "SemiBold" }
        );
        registerFont(
            join(this.getFrontendPath(), "src", "fonts", "Exo-Bold.ttf"),
            { family: "Exo", style: "Bold" }
        );
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

    static refreshTopPP(): void {
        setTimeout(() => this.refreshTopPP(), 1800 * 1000);

        DatabaseManager.elainaDb.collections.userBind
            .get({}, { projection: { _id: 0, username: 1, pp: 1 } })
            .then((res) => {
                this.topPPList.clear();

                this.topPPList.set("", []).set("-", []);

                for (const player of res) {
                    const ppEntries = player.pp;

                    for (const ppEntry of ppEntries) {
                        const topEntry: TopPPEntry = {
                            ...ppEntry,
                            username: player.username,
                        };

                        this.topPPList.get("")!.push(topEntry);

                        const droidMods =
                            [
                                ...ModUtil.pcStringToMods(ppEntry.mods).reduce(
                                    (a, v) => {
                                        if (!v.isApplicableToDroid()) {
                                            return a;
                                        }

                                        return a + v.droidString;
                                    },
                                    ""
                                ),
                            ]
                                .sort((a, b) => a.localeCompare(b))
                                .join("") || "-";

                        const playList = this.topPPList.get(droidMods) ?? [];

                        playList.push(topEntry);

                        this.topPPList.set(droidMods, playList);
                    }
                }

                for (const [, plays] of this.topPPList) {
                    plays.sort((a, b) => {
                        return b.pp - a.pp;
                    });

                    plays.splice(100);
                }
            });
    }

    static refreshPrototypeTopPP(): void {
        setTimeout(() => this.refreshPrototypeTopPP(), 600 * 1000);

        DatabaseManager.aliceDb.collections.prototypePP
            .get({}, { projection: { _id: 0, username: 1, pp: 1 } })
            .then((res) => {
                this.topPrototypePPList.clear();

                this.topPrototypePPList.set("", []).set("-", []);

                for (const player of res) {
                    const ppEntries = player.pp;

                    for (const ppEntry of ppEntries) {
                        const topEntry: TopPrototypePPEntry = {
                            ...ppEntry,
                            username: player.username,
                        };

                        this.topPrototypePPList.get("")!.push(topEntry);

                        const droidMods =
                            [
                                ...ModUtil.pcStringToMods(ppEntry.mods).reduce(
                                    (a, v) => {
                                        if (!v.isApplicableToDroid()) {
                                            return a;
                                        }

                                        return a + v.droidString;
                                    },
                                    ""
                                ),
                            ]
                                .sort((a, b) => a.localeCompare(b))
                                .join("") || "-";

                        const playList =
                            this.topPrototypePPList.get(droidMods) ?? [];

                        playList.push(topEntry);

                        this.topPrototypePPList.set(droidMods, playList);
                    }
                }

                for (const plays of this.topPrototypePPList.values()) {
                    plays.sort((a, b) => {
                        return b.pp - a.pp;
                    });

                    plays.splice(100);
                }
            });
    }

    /**
     * Downloads a beatmap's .osu file.
     *
     * @param beatmapId The ID of the beatmap to download.
     */
    static downloadBeatmap(beatmapId: number): Promise<string> {
        return new Promise((resolve) => {
            let data = "";

            request(`https://osu.ppy.sh/osu/${beatmapId}`, {
                encoding: "utf-8",
            })
                .on("data", (chunk) => {
                    data += chunk;
                })
                .on("complete", () => {
                    resolve(data);
                });
        });
    }
}
