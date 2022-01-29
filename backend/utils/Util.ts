import request from "request";
import { Request } from "express";
import { join } from "path";
import { DatabaseManager } from "../database/DatabaseManager";
import { UserBind } from "../database/utils/elainaDb/UserBind";
import { Mod, ModUtil } from "@rian8337/osu-base";
import { PPEntry } from "../structures/PPEntry";
import { TopPPEntry } from "../structures/TopPPEntry";
import { TopPrototypePPEntry } from "../structures/TopPrototypePPEntry";
import { PrototypePPEntry } from "../structures/PrototypePPEntry";
import { PrototypePP } from "../database/utils/aliceDb/PrototypePP";
import { registerFont } from "canvas";
import { ReadStream } from "fs";

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
    static readonly topPPList: Map<string, TopPPEntry[]> = new Map();

    /**
     * List of top prototype plays from all players, mapped by droid mod string that's sorted alphabetically.
     */
    static readonly topPrototypePPList: Map<string, TopPrototypePPEntry[]> =
        new Map();

    /**
     * Gets the path to frontend directory.
     */
    static getFrontendPath(): string {
        return join(process.cwd(), "frontend");
    }

    /**
     * Converts an array into a map.
     *
     * @param array The array.
     * @param key The key that will be used to map each value in the array.
     * @returns The collection from the array.
     */
    static arrayToMap<K extends keyof V, V>(array: V[], key: K): Map<V[K], V> {
        const map: Map<V[K], V> = new Map();

        for (const item of array) {
            map.set(item[key], item);
        }

        return map;
    }

    static initCanvas(): void {
        registerFont(join(this.getFrontendPath(), "fonts", "Exo-Medium.ttf"), {
            family: "Exo",
        });
        registerFont(
            join(this.getFrontendPath(), "fonts", "Exo-SemiBold.ttf"),
            {
                family: "Exo",
                style: "SemiBold",
            }
        );
        registerFont(join(this.getFrontendPath(), "fonts", "Exo-Bold.ttf"), {
            family: "Exo",
            style: "Bold",
        });
    }

    static convertURI(input: string): string {
        input = decodeURIComponent(input);

        const arr: string[] = input.split("");

        for (let i = 0; i < arr.length; ++i) {
            if (i !== arr.length - 1 && arr[i] === "+" && arr[i + 1] !== "+") {
                arr[i] = " ";
            }
        }

        return arr.join("");
    }

    static convertURIregex(input: string): string {
        input = decodeURIComponent(input);

        const arr: string[] = input.split("");

        const characterToReplace: string = "*?$()[]\"':";

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
        const comparisonString: string = this.getComparisonText(comparison);

        return Object.defineProperty({}, comparisonString, {
            value,
            writable: true,
            configurable: true,
            enumerable: true,
        });
    }

    static refreshTopPP(): void {
        setTimeout(() => this.refreshTopPP(), 1800 * 1000);
        console.log("Refreshing top plays");

        DatabaseManager.elainaDb.collections.userBind
            .get({}, { projection: { _id: 0, username: 1, pp: 1 } })
            .then((res) => {
                this.topPPList.clear();

                this.topPPList.set("", []).set("-", []);

                for (let i = 0; i < res.length; ++i) {
                    const bindInfo: UserBind = res[i];

                    const ppEntries: PPEntry[] = bindInfo.pp ?? [];

                    for (const ppEntry of ppEntries) {
                        const convertedMods: Mod[] = ModUtil.pcStringToMods(
                            ppEntry.mods
                        );

                        const topEntry: TopPPEntry = {
                            ...ppEntry,
                            username: bindInfo.username,
                        };

                        this.topPPList.get("")!.push(topEntry);

                        const droidMods: string =
                            convertedMods
                                .map((v) => v.droidString)
                                .sort((a, b) => a.localeCompare(b))
                                .join("") || "-";

                        const playList: TopPPEntry[] =
                            this.topPPList.get(droidMods) ?? [];

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

                console.log("Refreshing top plays done");
            });
    }

    static refreshPrototypeTopPP(): void {
        setTimeout(() => this.refreshPrototypeTopPP(), 600 * 1000);
        console.log("Refreshing top prototype plays");

        DatabaseManager.aliceDb.collections.prototypePP
            .get({}, { projection: { _id: 0, username: 1, pp: 1 } })
            .then((res) => {
                this.topPrototypePPList.clear();

                this.topPrototypePPList.set("", []).set("-", []);

                for (let i = 0; i < res.length; ++i) {
                    const playerInfo: PrototypePP = res[i];

                    const ppEntries: PrototypePPEntry[] = playerInfo.pp ?? [];

                    for (const ppEntry of ppEntries) {
                        const convertedMods: Mod[] = ModUtil.pcStringToMods(
                            ppEntry.mods
                        );

                        const topEntry: TopPrototypePPEntry = {
                            ...ppEntry,
                            username: playerInfo.username,
                        };

                        this.topPrototypePPList.get("")!.push(topEntry);

                        const droidMods: string =
                            convertedMods
                                .map((v) => v.droidString)
                                .sort((a, b) => a.localeCompare(b))
                                .join("") || "-";

                        const playList: TopPrototypePPEntry[] =
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

                console.log("Refreshing top prototype plays done");
            });
    }

    /**
     * Downloads a beatmap's .osu file.
     *
     * @param beatmapId The ID of the beatmap to download.
     */
    static downloadBeatmap(beatmapId: number): Promise<string> {
        return new Promise((resolve) => {
            let data: string = "";

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

    /**
     * Checks if a request is requesting prototype data.
     * 
     * @param req The request.
     */
    static requestIsPrototype(req: Request): boolean {
        return req.baseUrl.includes("prototype") || req.body.prototype;
    }

    /**
     * Reads a file stream and returns it as string.
     * 
     * @param stream The stream.
     */
    static readFile(stream: ReadStream): Promise<string> {
        const chunks: Buffer[] = [];

        return new Promise((resolve, reject) => {
            stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on("error", (err) => reject(err));
            stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        });
    }
}
