import { IPrototypePP, IUserBind } from "app-structures";

type PPProfileArray = IUserBind[] | IPrototypePP[];

type PPProfile = IUserBind | IPrototypePP;

type PPProfiles = PPProfile | PPProfileArray;

/**
 * Some utilities, no biggie.
 */
export abstract class Util {
    /**
     * Checks if data received from backend is a prototype data or not.
     *
     * @param data The data.
     */
    static isPrototype(data: PPProfileArray): data is IPrototypePP[];
    /**
     * Checks if data received from backend is a prototype data or not.
     *
     * @param data The data.
     */
    static isPrototype(data: PPProfile): data is IPrototypePP;
    static isPrototype(data: PPProfiles) {
        if (Array.isArray(data)) {
            return "prevpptotal" in data[0];
        } else {
            return "prevpptotal" in data;
        }
    }

    /**
     * Parses possible combination mods from a string.
     *
     * @param str The string to parse from.
     * @returns The mod combinations.
     */
    static parseMods(str: string): string[] | null {
        return str.toUpperCase().match(/[\s\S]{2}/g);
    }
}
