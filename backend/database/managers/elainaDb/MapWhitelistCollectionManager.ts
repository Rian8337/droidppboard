import { MapWhitelist } from "../../utils/elainaDb/MapWhitelist";
import { DatabaseMapWhitelist } from "../../structures/elainaDb/DatabaseMapWhitelist";
import { DatabaseCollectionManager } from "../DatabaseCollectionManager";
import { Collection, Filter, Sort } from "mongodb";
import { DatabaseUtilityConstructor } from "../../DatabaseUtilityConstructor";

/**
 * A manager for the `mapwhitelist` command.
 */
export class MapWhitelistCollectionManager extends DatabaseCollectionManager<
    DatabaseMapWhitelist,
    MapWhitelist
> {
    protected override readonly utilityInstance: DatabaseUtilityConstructor<
        DatabaseMapWhitelist,
        MapWhitelist
    >;

    override get defaultDocument(): DatabaseMapWhitelist {
        return {
            diffstat: {
                cs: 0,
                ar: 0,
                od: 0,
                hp: 0,
                sr: 0,
                bpm: 0,
            },
            hashid: "",
            mapid: 0,
            mapname: "",
        };
    }

    /**
     * @param collection The MongoDB collection.
     */
    constructor(collection: Collection<DatabaseMapWhitelist>) {
        super(collection);

        this.utilityInstance = <
            DatabaseUtilityConstructor<DatabaseMapWhitelist, MapWhitelist>
            >new MapWhitelist().constructor;
    }

    /**
     * Gets a list of whitelisted beatmaps.
     *
     * @param page The page to get.
     * @param searchQuery The query to search for.
     * @param sort The sorting option.
     * @returns The whitelisted beatmaps that matches the search query, up to 30.
     */
    async getWhitelistedBeatmaps(
        page: number,
        searchQuery: Filter<DatabaseMapWhitelist> = {},
        sort: Sort = {}
    ): Promise<MapWhitelist[]> {
        const result: DatabaseMapWhitelist[] = await this.collection
            .find(searchQuery, {
                projection: { _id: 1, mapid: 1, mapname: 1, diffstat: 1 },
            })
            .sort(sort)
            .skip(30 * (page - 1))
            .limit(30)
            .toArray();

        return result.map((v) => new MapWhitelist(v));
    }
}
