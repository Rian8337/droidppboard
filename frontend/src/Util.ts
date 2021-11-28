import { DatabasePrototypePP, DatabaseUserBind, PrototypePP, UserBind } from "app-database";

/**
 * Some utilities, no biggie.
 */
export abstract class Util {
    /**
     * Checks if data received from backend is a prototype data or not.
     * 
     * @param data The data.
     */
    static isPrototype(data: (DatabaseUserBind | DatabasePrototypePP)[]): data is DatabasePrototypePP[];
    /**
     * Checks if data received from backend is a prototype data or not.
     * 
     * @param data The data.
     */
    static isPrototype(data: (UserBind | PrototypePP)[]): data is PrototypePP[];
    /**
     * Checks if data received from backend is a prototype data or not.
     * 
     * @param data The data.
     */
    static isPrototype(data: DatabaseUserBind | DatabasePrototypePP): data is DatabasePrototypePP;
    /**
     * Checks if data received from backend is a prototype data or not.
     * 
     * @param data The data.
     */
    static isPrototype(data: UserBind | PrototypePP): data is PrototypePP;
    static isPrototype(data: (DatabaseUserBind | DatabasePrototypePP)[] | DatabaseUserBind | DatabasePrototypePP) {
        if (Array.isArray(data)) {
            return "prevpptotal" in data[0];
        } else {
            return "prevpptotal" in data;
        }
    }

    /**
     * Gets the backend domain with respect to the client.
     */
    static getDomain(): string {
        const regex: RegExp = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

        return `${window.location.protocol}//${window.location.hostname}${window.location.hostname === "localhost" || regex.test(window.location.hostname) ? ":5000" : ""}`;
    }
}