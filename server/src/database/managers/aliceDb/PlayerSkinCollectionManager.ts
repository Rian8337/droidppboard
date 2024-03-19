import { Filter } from "mongodb";
import { IPlayerSkin } from "app-structures";
import { Util } from "../../../utils/Util";
import { DatabaseCollectionManager } from "../DatabaseCollectionManager";

/**
 * A manager for the `playerskins` collection.
 */
export class PlayerSkinCollectionManager extends DatabaseCollectionManager<IPlayerSkin> {
    override get defaultDocument(): IPlayerSkin {
        return {
            discordid: "",
            name: "",
            description: "",
            url: "",
        };
    }

    /**
     * Searches for skins to display.
     *
     * @param page The page to display.
     * @param searchQuery The search query, if any.
     * @returns The skins, up to 50 skins.
     */
    searchSkins(page: number, searchQuery?: string): Promise<IPlayerSkin[]> {
        const query: Filter<IPlayerSkin> = searchQuery
            ? {
                  name: new RegExp(Util.convertURIregex(searchQuery), "i"),
              }
            : {};

        return this.collection
            .find(query, {
                projection: {
                    _id: 0,
                    discordid: 1,
                    name: 1,
                    description: 1,
                },
            })
            .skip(50 * (page - 1))
            .limit(50)
            .toArray();
    }

    /**
     * Gets a skin by its name.
     *
     * @param discordId The Discord ID of the skin owner.
     * @param name The name of the skin.
     * @returns The skin, `null` if not found.
     */
    getFromName(discordId: string, name: string): Promise<IPlayerSkin | null> {
        return this.getOne(
            {
                discordid: discordId,
                name: Util.convertURI(name),
            },
            {
                projection: {
                    _id: 0,
                },
            }
        );
    }
}
