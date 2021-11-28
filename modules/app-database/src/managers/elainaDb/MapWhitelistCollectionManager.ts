import { DatabaseMapWhitelist } from "../../structures/elainaDb/DatabaseMapWhitelist";
import { DatabaseCollectionManager } from "../DatabaseCollectionManager";
import { Collection, Filter, Sort } from "mongodb";

/**
 * A manager for the `mapwhitelist` command.
 */
export class MapWhitelistCollectionManager extends DatabaseCollectionManager<DatabaseMapWhitelist> {
    override get defaultDocument(): DatabaseMapWhitelist {
        return {
            diffstat: {
                cs: 0,
                ar: 0,
                od: 0,
                hp: 0,
                sr: 0,
                bpm: 0
            },
            hashid: "",
            mapid: 0,
            mapname: ""
        };
    }

    /**
     * @param collection The MongoDB collection.
     */
    constructor(collection: Collection<DatabaseMapWhitelist>) {
        super(collection);
    }

    /**
     * Gets a list of whitelisted beatmaps.
     * 
     * @param page The page to get.
     * @param searchQuery The query to search for.
     * @param sort The sorting option.
     * @returns The whitelisted beatmaps that matches the search query, up to 30.
     */
    getWhitelistedBeatmaps(page: number, searchQuery: Filter<DatabaseMapWhitelist> = {}, sort: Sort = {}): Promise<DatabaseMapWhitelist[]> {
        return this.collection.find(
            searchQuery, { projection: { _id: 0, mapid: 1, mapname: 1, diffstat: 1 } }
        ).sort(sort).skip(30 * (page - 1)).limit(30).toArray();
    }
}